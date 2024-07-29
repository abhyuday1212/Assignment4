import express from "express";
import dotenv from "dotenv"
import admin from 'firebase-admin'; 


dotenv.config(); 

// Firebase Function
admin.initializeApp({
    credential: admin.credential.cert(process.env.FIREBASE_CREDENTIALS_PATH),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const app = express();
const PORT = process.env.PORT

app.use(express.json());


// =--==-=-=-=- Firebase Realtime Database Operations =--=-=-=-=-=-=-=-

// ---------------------- Used for writing Data to DB ----------------------
/*  const db = admin.database();
 
function writeData(db) {
    const data = {
        sms: {
            sms1: {
                message: "Payment received",
                amount: 100,
                timestamp: 1658323200000
            },
            sms2: {
                message: "Payment sent",
                amount: 50,
                timestamp: 1658409600000
            },
            sms3: {
                message: "Payment received",
                amount: 200,
                timestamp: 1658496000000
            }
        }
    };

    const ref = db.ref('sms');
    ref.set(data)
        .then(() => {
            console.log('Data written successfully');
        })
        .catch(error => {
            console.error('Error writing data:', error);
    });
}

writeData(db)

*/
// ----------------------------------------------------

// Read Data from firebase Database(/getSMS Endpoint):
app.get('/getSMS', async (req, res) => {
    try {
        const smsRef = admin.database().ref('sms');
        const smsDataSnapshot = await smsRef.once('value');
        const smsData = smsDataSnapshot.val();

        if (typeof smsData === 'object' && smsData !== null) { 
            const smsEntries = smsData['sms']; 
            const totalSMSCount = Object.values(smsEntries).length;  

            return res.json({
                smsData: smsData,
                totalCount: totalSMSCount
            });
        } else {
            console.error('Unexpected SMS data format:', smsData);
            return res.status(500).json({ error: 'Failed to fetch SMS data' });
        }
    } catch (error) {
        console.error('Error fetching SMS data:', error);
        res.status(500).json({ error: 'Failed to fetch SMS data' });
    }
});

// ----------------------------------------------------
// Read and Write Data to Database (/processSMS Endpoint):
app.get('/processSMS', async (req, res) => {
    try {
        const smsRef = admin.database().ref('sms');
        const smsDataSnapshot = await smsRef.once('value');
        const smsData = smsDataSnapshot.val();

        
        let transformedData = {};

       
        if (!smsData || Object.keys(smsData).length === 0) {
            console.log('No SMS entries found.');
            res.json({ success: false, message: 'No SMS entries found.' });
            return;
        }

         
        Object.keys(smsData.sms).forEach(key => {
            const smsEntry = smsData.sms[key];

            if (!smsEntry.message || !Number.isFinite(smsEntry.amount) || !Number.isFinite(smsEntry.timestamp)) {
                console.warn(`Incomplete SMS entry for ${key}:`, smsEntry);
                return;
            }

            
            let timestamp = smsEntry.timestamp;
            if (typeof timestamp !== 'number') {
                timestamp *= 1000; 
            }
 
            const date = new Date(timestamp);

            // Format the date as YYYY-MM-DD HH:mm:ss
            let formattedTimestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

            transformedData[key] = {
                message: smsEntry.message,
                amount: smsEntry.amount,
                timestamp: smsEntry.timestamp,
                formattedTimestamp: formattedTimestamp
            };
        });

       
        if (Object.keys(transformedData).length === 0) {
            console.log('No valid SMS entries found to transform.');
            res.json({ success: false, message: 'No valid SMS entries found to transform.' });
            return;
        }

        const formattedSmsRef = admin.database().ref('formatted_sms');
        await formattedSmsRef.set(transformedData);

        const finalSmsRef = admin.database().ref('formatted_sms');
        const finalSmsData = await finalSmsRef.once('value');
        const SavedSmsArray = finalSmsData.val();



        res.json({ success: true, message: 'SMS data processed successfully', formatted_sms: SavedSmsArray });
    } catch (error) {
        console.error('Error processing SMS data:', error);
        res.status(500).json({ error: 'Failed to process SMS data' });
    }
});


// ----------------------------------------------------

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server Running on PORT", PORT);
})