const nodemailer = require('nodemailer');
nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'quilongroup3555@gmail.com', pass: '"pcyi vwqp quxu gpbf"' }
}).sendMail({
  from: 'quilongroup3555@gmail.com',
  to: 'quilongroup3555@gmail.com',
  subject: 'Test',
  text: 'Test'
}).then(i => console.log('Success')).catch(e => console.error('Error:', e.message));
