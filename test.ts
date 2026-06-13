fetch('http://127.0.0.1:3000/api/backend/scan?domain=google.com').then(r=>console.log(r.status)).catch(e=>console.error(e))
