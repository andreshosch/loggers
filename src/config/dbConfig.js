require("dotenv").config()
// //CONEXION A LA DB EN MONGO

const config = {
    mongoDb: {
        url: process.env.URL_BD,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    }
}

module.exports=config;
