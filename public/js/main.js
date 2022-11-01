let socket = io()

fetch("/api/productos-test")
    .then(response => response.json())
    .then(data => {
        renderTable(data);
    })
    .catch(error => console.log(error));

function renderTable(data) {
    const table = document.getElementById("table");
    const html = data.map(element => {
        return (`<tr>
        <td>${element.name}</td>
        <td>${element.price}</td>
        <td><img src="${element.image}" style="height:50px"></td>
        </tr>`);
    }).join("");
    table.innerHTML += html;
}

fetch("/api/info")
    .then(response => response.json())
    .then(data => {
        renderInfo(data);
    })
    .catch(error => console.log(error));

function renderInfo(data) {
    const info = document.getElementById("info");
    const html = data.map(element => {
        return (`<br><br><div>
        PID: ${element.pid}<br><br>
        VERSION: ${element.version}<br><br>
        MEMORIA: ${element.memoria}<br><br>
        SISTEMA OPERATIVO: ${element.sistemaOperativo}<br><br>
        CARPETA PROYECTO: ${element.carpeta}<br><br>
        PATH: ${element.path}<br><br>
        ARGUMENTO: ${element.argumento}<br><br>
        PROCESADORES: ${element.procesadores}<br><br>
        </div><br><br>`);
    }).join("");
    info.innerHTML += html;
}

const ingresoMensaje = document.getElementById("ingresoMensaje");
const botonEnviar = document.getElementById("botonEnviar");

botonEnviar.addEventListener('click', (e) => {
    e.preventDefault()
    const mensaje = {
        author: {
            id: ingresoMensaje.children.id.value,
            nombre: ingresoMensaje.children.nombre.value,
            apellido: ingresoMensaje.children.apellido.value,
            edad: ingresoMensaje.children.edad.value,
            alias: ingresoMensaje.children.alias.value,
            avatar: ingresoMensaje.children.avatar.value,
        },
        text: ingresoMensaje.children.text.value
    }
    socket.emit('enviarMensaje', mensaje);
})

//NORMALIZAR ESQUEMAS
const authorsSchema = new normalizr.schema.Entity('authors');
const msjSchema = new normalizr.schema.Entity('mensajes', { author: authorsSchema }, { idAttribute: 'id' });
const fileSchema = [msjSchema]

const renderMsj = (msj) => {
    msj.map(element => {
        const html = ` <article class=text-center>
        <span class="id mail">${element._doc.author.id}</span><span class="date">[${element._doc.author.timestamp}]:</span><span class="mensaje">${element._doc.text}</span><img src="${element._doc.author.avatar}" alt="avatar" class="avatar">
                        </article>`;
        const mensajes = document.getElementById("mensajes");
        mensajes.innerHTML += html;
    })
}

//DESNORMALIZAR ESQUEMAS

socket.on('mensajes', (msj) => {
    const denormMsjs = normalizr.denormalize(msj.result, fileSchema, msj.entities);
    renderMsj(denormMsjs);
    renderComp(msj, denormMsjs);
})

//RENDERIZAR MENSAJES


const renderComp = (msj, denormMsjs) => {
    const comp = document.getElementById("compresion");
    const denormMsjsLength = (JSON.stringify(denormMsjs)).length;
    const msjLength = (JSON.stringify(msj)).length;
    const compresion = ((msjLength - denormMsjsLength) / msjLength * 100).toFixed(2);
    comp.innerHTML = `(Compresion: ${compresion}%)`;
}

//LOGIN-LOGOUT 

fetch ("/loginEnv")
.then(response => response.json())
 .then (data=>{
    userName=data.user;
    document.getElementById("userName").innerHTML=`<div class="titleLogin">Bienvenid@ ${userName}</div>`
 })
 .catch(error=>console.log(error))

//loading screen
const spinner = document.getElementById("spinner");
spinner.style.display = "none";

//logout con loading screen
document.getElementById("logout").addEventListener
    ('click', (e) => {
        e.preventDefault()
        fetch("/logout")
            .then(spinner.style.display = "flex")
            .then(response => response.json())
            .finally(() => {
                window.location.href = "/logoutMsj";
            })
    })





