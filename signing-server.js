const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3000; // Use the PORT environment variable provided by Heroku

// Configure CORS to allow requests from your domain
const corsOptions = {
    origin: 'https://jorkthepork.com',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Set up file upload handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Create 'uploads' directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

function generateRandomString(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        randomString += charset[randomIndex];
    }
    return randomString;
}

app.post('/sign', upload.fields([
    { name: 'p12', maxCount: 1 },
    { name: 'mobileProvision', maxCount: 1 },
    { name: 'ipa', maxCount: 1 }
]), (req, res) => {
    const originalIpaName = path.basename(req.files['ipa'][0].originalname, path.extname(req.files['ipa'][0].originalname));
    const p12Path = req.files['p12'][0].path;
    const mobileProvisionPath = req.files['mobileProvision'][0].path;
    const ipaPath = req.files['ipa'][0].path;
    const password = req.body.password;
    const randomSuffix = generateRandomString(7);

    // Define the path for the signed IPA file
    const signedIpaName = `${originalIpaName}.ipa`;
    const signedIpaPath = path.join('uploads', signedIpaName);

    // Construct the command to sign the IPA file
    const codesignCommand = `~/Desktop/ipa/zsign -k "${p12Path}" -p "${password}" -m "${mobileProvisionPath}" -o "${signedIpaPath}" -b 'com.jorkhub.${randomSuffix}' -n 'Esign' "${ipaPath}"`;

    exec(codesignCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error signing app: ${error}`);
            return res.status(500).json({ error: 'Failed to sign IPA' });
        }

        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);

        // Send the signed IPA file as a download
        res.download(signedIpaPath, signedIpaName, (err) => {
            if (err) {
                console.error(`Error sending file: ${err}`);
                res.status(500).json({ error: 'Failed to send signed IPA' });
            }
        });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
