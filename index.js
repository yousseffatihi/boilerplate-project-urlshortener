require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
var bodyParser = require('body-parser');
var validUrl = require('valid-url');


const { MongoClient, ServerApiVersion } = require('mongodb');

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Get the database (it will be created if it doesn't exist)
const db = client.db('test');

// Get the collection (it will be created if it doesn't exist)
const collection = db.collection('links');


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())


app.use('/public', express.static(`${process.cwd()}/public`));

function checkIsValidShortURL(shortURL) {
  for (let index = 0; index < shortURL.length; index++) {
    const element = parseInt(shortURL[index], 10);

    if (isNaN(element) || element === null) {
      return false;
    }
  }

  return true;
}

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:shorturl?', async (req, res) => {
  const tempShortURL = req.params.shorturl;

  if (!tempShortURL) {
    return res.status(404).json({ error: "Not found" });
  }

  if (!checkIsValidShortURL(tempShortURL)) {
    return res.status(400).json({ error: "Wrong format" });
  }

  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const filterDoc = { shorturl: parseInt(tempShortURL, 10) };
    const foundDoc = await collection.findOne(filterDoc);

    if (foundDoc) {
      console.log(foundDoc);
      return res.redirect(foundDoc.name);
    } else {
      return res.status(404).json({ error: "No short URL found for the given input" });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  } finally {
    // Ensure the MongoDB client is closed
    await client.close();
  }
});

// Your first API endpoint
app.post('/api/shorturl', async (req, res) => {
  const tempurl = req.body.url;

  console.log(tempurl);

  if (!validUrl.isWebUri(tempurl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const filtreDoc = { name: tempurl }

    const foundDoc = await collection.findOne(filtreDoc);

    if (foundDoc) {
      console.log(foundDoc);
      return res.json({ original_url: foundDoc.name, short_url: foundDoc.shorturl });
    }

    // Count documents in the collection to determine the next short URL
    const countResult = await collection.countDocuments();
    const shortUrl = countResult + 1;

    // Insert the new document into the collection
    const doc = { name: tempurl, shorturl: shortUrl };
    const result = await collection.insertOne(doc);

    console.log(`Document inserted with _id: ${result.insertedId}`);

    // Return the short URL and original URL in the response
    res.json({ original_url: tempurl, short_url: shortUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  } finally {
    // Close the MongoDB client
    await client.close();
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
