const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
const { json } = require('express');
const { parse } = require('dotenv');
require('dotenv').config();
const { MongoClient } = require("mongodb");
const ObjectId = require('mongodb').ObjectId;
const fileupload = require('express-fileupload')
const stripe = require('stripe')(process.env.STRIPE_SECRET)


app.use(cors())
app.use(express.json())
app.use(fileupload())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krqaw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {

    try {
        await client.connect()
        const database = client.db('doctors_portal')
        const appointmentsCollection = database.collection('appointments')
        const usersCollection = database.collection('users')
        const doctorsCollection = database.collection('doctors')

        app.post('/appointments', async (req, res) => {
            const appointmentsInfo = req.body;
            const result = await appointmentsCollection.insertOne(appointmentsInfo)
            res.send(result)
        })

        app.get('/appointments', async (req, res) => {
            const result = await appointmentsCollection.find({}).toArray()
            res.send(result)
        })

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            // console.log(date);
            const query = { email: email, date: date }
            const result = await appointmentsCollection.find(query).toArray()
            res.send(result)
        })

        // user api
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // add doctors api
        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const picture = req.files.image;
            const picData = picture.data;
            const encodedPicture = picData.toString('base64');
            const pictureBuffer = Buffer.from(encodedPicture, 'base64');
            const doctor = {
                name,
                email,
                image: pictureBuffer
            }
            const result = await doctorsCollection.insertOne(doctor)
            res.send(result)

        })

        // get doctors api
        app.get('/doctors', async (req, res) => {
            const result = await doctorsCollection.find({}).toArray()
            res.send(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            console.log(user);
            const filter = { email: user.email }
            const updateDoc = { $set: { role: 'admin' } }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.json(result)
        })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })


        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await appointmentsCollection.findOne(query)
            res.send(result)
        })

        //stripe payment api
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        })

        // payment update api
        app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    payment: payment
                }
            }
            const result = await appointmentsCollection.updateOne(filter, updateDoc)
            res.send(result)

        })

    }
    finally {

    }

}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello World!')
})




app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})