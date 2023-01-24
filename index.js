require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// ---> Solution Begin 

const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { json } = require('body-parser');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log("Connected to Mongo");
});

mongoose.connection.on('error', (err) => {
  console.log("Error", err);
});


const { Schema } = mongoose;

const urlSchema = new Schema({
  originalUrl: { type: String, required: true, unique: true },
  shortUrl: { type: Number, required: true, unique: true }
},
  {
    timestamps: true
  });

const urlModel = mongoose.model('Url', urlSchema);

app.post('/api/shorturl', bodyParser.urlencoded({ extended: false }), (req, res) => {
  const original_url = req.body['url'];
  let short_url = 1;
  let myResponse = {};
  myResponse["original_url"] = original_url;

  let urlRegex = new RegExp(/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i)

  if (!original_url.match(urlRegex)) {
    res.json({ error: 'Invalid URL' });
    return;
  }


  urlModel.findOne({ originalUrl: original_url })
    .then(data => {

      if (data === null) {
        urlModel.find({}).sort({ updatedAt: -1 }).limit(1).then((latestRecord) => {
          if (latestRecord.length !== 0) {
            short_url = short_url + latestRecord[0].shortUrl;
          }

          const newUrl = new urlModel({
            originalUrl: original_url,
            shortUrl: short_url
          });

          newUrl.save().then(result => {
            myResponse["short_url"] = short_url;
            res.send(myResponse);
          })
            .catch(err => {
              console.log(err);
            });

        });
      }
      else {
        short_url = data.shortUrl;
        myResponse["short_url"] = short_url;
        res.send(myResponse);
      }

    }).catch(err => {
      res.status(400).json('Error: ' + err);
    })

});

app.get('/api/shorturl/:input', (req, res) => {
  let short_url = req.params.input;

  urlModel.findOne({ shortUrl: short_url }).then(data => {
    if (data !== undefined) {
      res.redirect(data.originalUrl)
    } else {
      res.json('URL not Found')
    }
  }).
    catch(err => {
      res.status(400).json('URL not Found');
    });

});

// <--- Solution End

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
