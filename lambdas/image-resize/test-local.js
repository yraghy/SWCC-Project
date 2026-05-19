// Mock the AWS SDK before requiring the handler
const mockSend = async (command) => {
    const name = command.constructor.name;

    if (name === "GetObjectCommand") {
        const { Readable } = require("stream");
        // Return a tiny valid JPEG buffer as a fake image
        const fs = require("fs");
        const fakeImage = fs.readFileSync(__dirname + "/test-image.jpg"); // add any jpg here
        const stream = Readable.from([fakeImage]);
        return { Body: stream };
    }

    if (name === "PutObjectCommand") {
        console.log("Mock PutObject called with key:", command.input.Key);
        return {};
    }
};

// Patch the S3Client before index.js loads
const { S3Client } = require("@aws-sdk/client-s3");
S3Client.prototype.send = mockSend;

process.env.RESIZED_BUCKET = "mini-jira-resized";
process.env.AWS_REGION = "eu-central-1";

const mockEvent = {
    Records: [{
        s3: {
            bucket: { name: "mini-jira-originals" },
            object: { key: "uploads/test-image.jpg" }
        }
    }]
};

require("./index").handler(mockEvent)
    .then(result => console.log("Success:", JSON.stringify(result, null, 2)))
    .catch(console.error);