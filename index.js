require('dotenv').config();
const fetch = require('node-fetch');
var nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
var player = require('play-sound')(opts = { player: "c:\\asus\\mplayer\\mplayer.exe" })

var Memory_Emails = require('./RECEIVER_EMAILS.json').emails;
/*
//add new email to json:
console.log(Memory_Emails);
Memory_Emails.push('punyakant.yahoo.com');
let jsonToWrite = {
  emails: Memory_Emails
}
fs.writeFile(path.resolve(__dirname,'RECEIVER_EMAILS.json'), JSON.stringify(jsonToWrite), err => {
  if(err) {
    console.error(`URGENT >> ${Memory_Emails[Memory_Emails.length - 1]} was not added to JSON. Manual Action required.`);
    // todo: send Error to admin emails. 
  }
});
*/
let result = [];

var transporter = nodemailer.createTransport({
  host: process.env.MAIL_SMTP_SERVER,
  port: process.env.MAIL_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.MAILID,
    pass: process.env.MAIL_APPLICATION_PASSWORD
  },
  tls: {
    ciphers: 'SSLv3'
  }
});




let sendEmailsBro = (result, currentDate) => {
  console.log(currentDate, ' >> Sending Emails.. found something I guess.');
  if (!(result.length && result.length > 0)) return;
  let emailBody = 'Saste nashe available here: go enjoy...\n\n';
  for (let i = 0; i < result.length; i++) {
    emailBody += `${i + 1}. ${result[i]}\n`;
  }
  emailBody += `Please visit official Modiji powered website: <a>https://selfregistration.cowin.gov.in</a>`;

  var mailOptions = {
    from: '"Vacc Notifier © - Powered by MS™" <covid_notifier@zohomail.in>',
    to: Memory_Emails.toString(),
    subject: `Available Centers: ${result.length}`,
    text: emailBody
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log(`Emails sent to ${Memory_Emails.length} emails`);
    }
  });
}

const KURUKSHETRA_ID = 186;

let getTodayDate = () => {

  let today = new Date();
  let dd = today.getDate();

  let mm = today.getMonth() + 1;
  let yyyy = today.getFullYear();

  let hh = today.getHours();
  let min = today.getMinutes();
  let sec = today.getSeconds();
  if (dd < 10) {
    dd = '0' + dd;
  }

  if (mm < 10) {
    mm = '0' + mm;
  }
  return [dd + '-' + mm + '-' + yyyy, `${hh}:${min}:${sec}`];
}
let runThisShit = () => {
  let currentDate = getTodayDate();

  let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${KURUKSHETRA_ID}&date=${currentDate[0]}`;

  let settings = {
    method: "GET",
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
    }
  };

  fetch(url, settings)
    .then(res => res.json())
    .then((json) => {
      let centers = json.centers;
      for (let i = 0; i < centers.length; i++) {
        let sessionName = centers[i].name;
        let sessions = centers[i].sessions;
        for (let j = 0; j < sessions.length; j++) {
          let available = +sessions[j].available_capacity;
          let date = sessions[j].date;
          if (available > 0) {
            result.push(`${sessionName}@${date} -- ${available}`);
          }
          //console.log(`${sessionName}@${date} -- ${available}`);
        }
      }
      //console.log(`Total available centers with vaccines: ${result.length}`);
      //result.push(`Sorry bro no nashe available at the moment. \n\n<>Ghar raho. Safe raho.</b>`);
      if (result.length > 0) {
        player.play('./doorbell.mp3', function (err) {
          if (err) throw err;
        });
        sendEmailsBro(result, currentDate);
      } else {
        console.log(`${currentDate} -- Khatam / Tata / Bye Bye`);
      }
    });

}
setInterval(runThisShit, 3500);
//runThisShit();