self.addEventListener('install', installEvent =>{
    console.log('Starting install');

});


self.addEventListener('activate',activateEvent =>{
    console.log('SW activated');
});


self.addEventListener('fetch',fetchEvent=>{
    console.log(fetchEvent);
})