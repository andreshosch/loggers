
fetch ("/getUserNameEnv")
.then(response => response.json())
 .then (data=>{
    userName=data.user;
    document.getElementById("userName").innerHTML=`<div class="titleLogin">Hasta la próxima ${userName}</div>`
 })
 .catch(error=>console.log(error))

setTimeout(() => {
    location.assign('/');
}, 2000);
