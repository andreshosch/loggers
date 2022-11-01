const express=require("express");
const routerProducto=require("./src/routes/routes.js")
const{Server:http}=require ("http");
const {Server:ioServer}=require ("socket.io");
const {saveMsjs, getMsjs}=require ("./src/controllers/mensajes.js");
const cookieParser=require("cookie-parser")
const session =require("express-session")
const MongoStore=require("connect-mongo")
const compression = require("compression");
const gzipMiddleware = compression();
const { fork } = require('child_process')
const child = fork("./child.js")
const {
  loggerDev,
  loggerProd
} = require("./logger_config");

const NODE_ENV = process.env.NODE_ENV || "development";
const logger = NODE_ENV === "production"
? loggerProd
: loggerDev

//VARIABLE PARA CONTROLAR EL ERROR.LOG, SI CONTADOR PRODCUTOS ES MAYOR A 5 ARROJA ERROR
const contadorproductos=8;


const LocalStrategy = require('passport-local').Strategy;
const passport = require("passport");
const { comparePassword, hashPassword } = require("./utils")
const User=require("./src/schema/schemaUser.js")

const { Types } = require("mongoose");
//==================
const cluster = require("cluster");
const {cpus} = require('os');
const cpuNum = cpus().length;
//==================

const app = express();
const httpserver = http(app)
const io = new ioServer(httpserver)

// app.use(express.static('public'));



// const args = parseArgs(process.argv.slice(2));
// const args = process.argv.slice(2);
// console.log(args)

// const PORT = args.length > 0 ? args[0] : 8080;

//const PORT = process.env.PORT || 8080;



const yargs = require("yargs");
const args = yargs(process.argv.slice(2))

  .alias({
    m: "modo",
    p: "puerto",
    d: "debug",
  })
  .default({
    modo: "FORK",
    puerto: 8080,
    debug: false
  })
  .argv

const modoCluster = args.m === 'CLUSTER';

if(modoCluster){
  console.log("Se iniciará en modo CLUSTER")
}
else{
  console.log("Se iniciará en modo FORK")
}

/////////////////////////////////////////

if (modoCluster && cluster.isPrimary) {
  console.log(`Cluster iniciado. CPUS: ${cpuNum}`);
  console.log(`PID: ${process.pid}`);
  for (let i = 0; i < cpuNum; i++) {
    cluster.fork();
  }

  cluster.on("exit", worker => {
    console.log(`${new Date().toLocaleString()}: Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  const app = express();
  const httpserver = http(app)
  const io = new ioServer(httpserver)


/////////////////////////////////////////////INICIO

app.use("/public", express.static('./public/'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/', routerProducto);


app.use(session({
  secret: 'andreshosch',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    mongoUrl:process.env.URL_BD,
    retries: 0,
    ttl: 10 * 60 , // 10 min
  }),
})
);
//============

app.use(passport.initialize());
app.use(passport.session());


passport.use("login", new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (user==""){
  const passHash = user.password;
   if (!user || !comparePassword(password, passHash)) {
     return done(null, null, { message: "Invalid username or password" });
   }
  }
  return done(null, user);
}));


passport.use("signup", new LocalStrategy({
    passReqToCallback: true
  }, async (req, username, password, done) => {
    const user = await User.findOne({ username });
    if (user) {
     return done(new Error("El usuario ya existe!"),
     null);
    }
    const address = req.body.address;
    const hashedPassword = hashPassword(password);
    const newUser = new User({ username, password: hashedPassword , address });
    await newUser.save();
    return done(null, newUser);
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser(async (id, done) => {
    id = Types.ObjectId(id);
    const user = await User.findById(id);
    done(null, user);
  });

//RECUPERO EL NOMBRE YA EN SESION INICIADA
app.get('/loginEnv', (req, res) => {
    process.env.USER=req.user.address;
    const user = process.env.USER;
    
    res.send({
        user
    })
  })
  
  //RECUPERO EL NOMBRE YA EN SESION INICIADA
  app.get('/getUserNameEnv', (req, res) => {
    const user = process.env.USER;
      res.send({
        user
    })
  })
//============

//============

app.get("/", (req,res)=>{
   if (contadorproductos>5){
   logger.log("error",`No esta permitido mostrar ${contadorproductos} productos, el maximo es 5`)
   }
    try{
        if (req.session.user){
           res.sendFile(__dirname + ('/public/index.html'))
        }
        else
        {
            res.sendFile(__dirname + ('/views/login.html'))
        }
    }
    catch (error){
     console.log(error)
    }

})

io.on('connection', async (socket) => {
  console.log('Usuario conectado');
  socket.on('enviarMensaje', (msj) => {
      saveMsjs(msj);
  })

  socket.emit ('mensajes', await getMsjs());
})



// DEFINO EL NOMBRE DE USUARIO DE LA SESSION

app.post('/setUserName', (req, res) => {
    req.session.user = req.body.user;
    process.env.USER=req.body.user;
    const usuario=process.env.USER;
    res.redirect('/');
})



//TOMO EL USERNAME POR SESSION

app.get("/getUserName",(req,res)=>{
    try{
        if (req.session.user){
            const user=process.env.USER;
            res.send({
                user,
                
            })
        }
        else
        res.send({
            username:"no existe el usuario"
        })
    }
    catch(error){
        console.log(error)
    }
})

//RECUPERO EL NOMBRE YA EN SESION INICIADA
app.get('/getUserNameEnv', (req, res) => {
    const user = process.env.USER;
    res.send({
        user
    })
})




// DESLOGUEO DE USUARIO

app.get('/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/logout');
            }
        })
    } catch (err) {
        console.log(err);
    }
})
app.get('/logoutMsj', (req, res) => {
    try {
        res.sendFile(__dirname + '/views/logout.html');
        logger.log("info",`Ingreso a la ruta${req.url}`)
    }
    catch (err) {
        console.log(err);
    }
})


// ==============
app.get("/info",gzipMiddleware, (req,res) => {
  res.sendFile(__dirname + "/views/info.html");
  logger.log("info",`Ingreso a la ruta${req.url}`)
  
})


app.get("/api/random", (req,res) => {
  const losRandom = req.query.num ||  500
  logger.log("info",`Ingreso a la ruta${req.url}`)
  child.send(losRandom)
  child.on('message', (msg) => {
    res.end(msg)
  })

// res.sendFile(__dirname + "/views/aleatorios.html")
})


// routerProducto.post("/actualizar", isAdmin, (req,res) => {
//   myWine.updateProduct(req.body.id, req.body)
//   .then((products) => res.render("productos_id",products))
// })


app.get("/login", (req, res) => {
    const user=req.session.user;
    res.sendFile(__dirname + "/views/login.html");
    logger.log("info",`Ingreso a la ruta${req.url}`)
  });

  app.get("/signup", (req, res) => {
    res.sendFile(__dirname + "/views/signup.html");
    logger.log("info",`Ingreso a la ruta${req.url}`)
  });

  app.get("/loginFail", (req, res) => {
    res.sendFile(__dirname + "/views/loginFail.html");
    logger.log("info",`Ingreso a la ruta${req.url}`)
  });

  app.get("/signupFail", (req, res) => {
    res.sendFile(__dirname + "/views/signupFail.html");
    logger.log("info",`Ingreso a la ruta${req.url}`)
  });


  app.post("/signup", passport.authenticate("signup", {
    failureRedirect: "/signupFail",
  }) , (req, res) => {  
    req.session.user = req.user;
    res.redirect("/login");
  });
  
  app.post("/login", passport.authenticate("login", {
    failureRedirect: "/loginFail",
  }) ,(req, res) => {
      req.session.user = req.user;
      res.redirect('/');
  });
// ==============

// Ruta por defecto: Recurso no encontrado
app.get("*", (req, res) => {
  logger.log("warn",`Ruta no encontrada ${req.url}`)
  res.status(400).send(`Ruta no encontrada ${req.url}`);
});

// // Ruta por defecto: Recurso no encontrado
// app.get("/api/productos-test", (req, res) => {
//   logger.log("error",`Ruta no encontrada ${req.url}`)
//   res.status(400).send(`Ruta no encontrada ${req.url}`);
// });

/////////////////////////////////////////////FIN


  const server = httpserver.listen(args.p, () => {
    console.log(`Server is running on port: ${server.address().port}`);
});
server.on('error', error => console.log(`error running server: ${error}`));

}
////////////////////////////////////////////////

//   const server = httpserver.listen(args.p, () => {
//     console.log(`Server is running on port: ${server.address().port}`);
// });
// server.on('error', error => console.log(`error running server: ${error}`));

// server.on("error", (err) => {
//   // Manejo de errores del servidor
//   logger.log("error",`Ocurrio un error al iniciar el servidor ${err}`)
// });