const {Router}=require("express");
const {createFakeProducts}=require("../controllers/products.js")
const {fork}=require("child_process")
const child= fork("./child.js")

const routerProducto = Router();

routerProducto.
    route('/productos-test')
    .get(async (req, res) => {

        const products = await createFakeProducts();
        if (products.length > 0) {
            res.status(200).json(products);
        } else {
            res.status(404).send({ message: "Productos no encontrado" });
        }
    })

    routerProducto.
    route('/info')
    .get(async (req, res) => {
        const info=[{pid: process.pid,
         version: process.version,
         id:process.id,
         memoria:process.memoryUsage().rss,
         sistemaOperativo:process.platform,
         carpeta: process.cwd(),
         path:process.argv[0],
         argumento: process.argv.slice(2),
         procesadores: require("os").cpus().length
        }]
        if (info)
     res.status(200).json(info);
     else{
        res.status(404).send({ message: "Productos no encontrado" });
     }
    })

    routerProducto.route("/randoms").get(async(req,res)=>{
    const random=req.query.cant||100000000
       child.send(random)
       child.on("message",(msg)=>
       {res.end(msg)})
    
    })

    module.exports= routerProducto;
