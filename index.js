const express = require('express');
const app = express();
const port = 3000;
const { NFC } = require('nfc-pcsc');
const nfc = new NFC();
const ndef = require('ndef');
const KEY_TYPE_B = 0x61;
const KEY_TYPE_A = 0x60;
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });
let globalReader = null;


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

wss.on('connection', function connection(ws) {
    console.log('Client connected');
    ws.on('message', async function incoming(MessageToInput) {
        try {
            console.log('received: %s', MessageToInput);
            console.log(MessageToInput.length)
            if (MessageToInput.length > 16 && MessageToInput.length < 33) {
                const blockSize = 16;
                const SplitObject = []
                const jsonString = MessageToInput.toString()
                for (let i = 0; i < jsonString.length; i += blockSize) {
                    SplitObject.push(jsonString.slice(i, i + blockSize));
                }
                let value = ""
                for (let a = 0; a < SplitObject.length; a++) {
                    let dt = SplitObject[a];
                    if (dt.length < blockSize) {
                        dt = dt.padEnd(16, '#');
                    }
                    await globalReader.authenticate(a + 1, KEY_TYPE_B, 'ffffffffffff');
                    const data = Buffer.allocUnsafe(dt.length);
                    data.fill(0);
                    const text = dt.toString()
                    data.write(text);
                    console.log('Writing to block', a + 1, " DATA: ", dt, text.length)
                    await globalReader.write(a + 1, data, text.length);
                }
                ws.send(200);
            } else {
                console.error('Error because length less than 16 or longer than 32')
                ws.send(500);
            }
        } catch (error) {
            console.error('Error because no card detected')
            ws.send(500);
        }
    });
    ws.on('error', (error) => {
        ws.send(500);
        console.error(error)
    })
    // ws.send('Connection established');
});
// nfc.on('reader', reader => {
//     console.log(`${reader.reader.name}  device attached`);
//     reader.on('card', async card => {
//         const blockSize = 16;
//         const SplitObject = []
//         const jsonString = "12345678901234567890"
//         for (let i = 0; i < jsonString.length; i += blockSize) {
//             SplitObject.push(jsonString.slice(i, i + blockSize));
//         }
//         console.log(SplitObject)
//         let value = ""
//         for (let a = 0; a < SplitObject.length; a++) {
//             let dt = SplitObject[a];
//             if (dt.length < blockSize) {
//                 dt = dt.padEnd(16, '#');
//             }
//             await reader.authenticate(a + 1, KEY_TYPE_B, 'ffffffffffff');
//             const data = Buffer.allocUnsafe(dt.length);
//             data.fill(0);
//             const text = dt.toString()
//             data.write(text);
//             console.log('Writing to block', a + 1, " DATA: ", dt, text.length)
//             // await reader.write(a + 1, data, text.length);
//         }
//     })
// })

nfc.on('reader', reader => {
    globalReader = reader;
    // console.log(`${reader.reader.name}  device attached`);
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(201);
        }
    });
    reader.on('card', async card => {
        const protocol = 't=cl';
        try {
            const blockSize = 16;
            const SplitObject = []
            const jsonString = "12345678901234567890"
            for (let i = 0; i < jsonString.length; i += blockSize) {
                SplitObject.push(jsonString.slice(i, i + blockSize));
            }
            // console.log(SplitObject)

            let value = ""
            for (let a = 0; a < SplitObject.length; a++) {
                let dt = SplitObject[a];
                if (dt.length < blockSize) {
                    dt = dt.padEnd(16, '#');
                }
                await reader.authenticate(a + 1, KEY_TYPE_B, 'ffffffffffff');
                // const data = Buffer.allocUnsafe(dt.length);
                // data.fill(0);
                // const text = dt.toString()
                // data.write(text);
                // console.log('Writing to block',a+1," DATA: ",dt,text.length)
                // await reader.write(a+1, data, text.length);

                const data = await reader.read(a + 1, 16);
                const payload = data.toString();
                value = value + payload

                // console.log('Sukses')
            }
            console.log(value)
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(value.replace(/#/g, ''));
                }
            });
            console.log(wss.clients.size)
        } catch (error) {
            console.error(`${reader.reader.name}  error writing payload to card:`, error);
            client.send(500);
        }
    });

    // Handle reader detach event
    reader.on('end', () => {
        console.log(`${reader.reader.name}  device removed`);
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(501);
            }
        });
    });

    // Handle errors
    reader.on('error', err => {
        console.error(`${reader.reader.name}  an error occurred:`, err);
    });
});


// nfc.on('reader', reader => {
//     console.log(`${reader.reader.name} device attached`);

//     reader.on('card', async card => {
//         console.log(`${reader.reader.name} card detected`, card);

//         try {
//             // await reader.authenticate(1, KEY_TYPE_B, 'ffffffffffff');
//             // await reader.authenticate(2, KEY_TYPE_B, 'ffffffffffff');
//             // await reader.authenticate(3, KEY_TYPE_B, 'ffffffffffff');
//             // await reader.authenticate(4, KEY_TYPE_B, 'ffffffffffff');
//             // const data = Buffer.allocUnsafe(16);
// 			// data.fill(0);
// 			// const text = "12345678901234567890"
// 			// data.write(text);

// 			// await reader.write(1, data,16);
// 			// console.log(`data written`);

//             const data = Buffer.allocUnsafe(16);
//             data.fill(0);
//             const text = (new Date()).toTimeString();
//             data.write(text); // if text is longer than 12 bytes, it will be cut off
//             // reader.write(blockNumber, data, blockSize = 4)
//             await reader.write(1, data,16); // starts writing in block 4, continues to 5 and 6 in order to write 12 bytes
//             console.log(`data written`);

//             // const data = await reader.read(1, 16); 
//             // console.log(`data read`, data);
//             // const payload = data.toString(); 
//             // console.log(`data converted`, payload);
//         } catch (err) {
//             console.error(`Error when writing data`, err);
//         }
//     });
// });



console.log('asd')