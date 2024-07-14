const { google } = require("googleapis");
const express = require("express");
require('dotenv').config();


const app = express();

//middlewares
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

//get,post,put methodları
app.get("/", async (req, res) => {
  const auth = new google.auth.GoogleAuth({
      keyFile: 'mountain_experiences_bot_key.json',
      scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const client = await auth.getClient();

  const googleSheets = google.sheets({ version: 'v4', auth: client });

  try {
      const response = await googleSheets.spreadsheets.get({
          spreadsheetId: process.env.SPREADSHEETS_ID,
      });

      const getRows1 = await googleSheets.spreadsheets.values.get({
          auth,
          spreadsheetId: process.env.SPREADSHEETS_ID,
          range: "Sheet1!C:D",
      });

      const getRows2 = await googleSheets.spreadsheets.values.get({
          auth,
          spreadsheetId: process.env.SPREADSHEETS_ID,
          range: "Sheet2!B:B",
      });

      const getRows3 = await googleSheets.spreadsheets.values.get({
          auth,
          spreadsheetId: process.env.SPREADSHEETS_ID,
          range: "Sheet1!I:I",
      });

      const mergedData = {};

      getRows1.data.values.slice(1).forEach((row, index) => {
          const normalizedCity = row[0].toLowerCase().replace(/[^a-z]+/g, '');

          const referalLink = row[1];
          const count = getRows2.data.values[index]; // Since getRows2 returns a 2D array

          if (!mergedData[normalizedCity]) {
              mergedData[normalizedCity] = {
                  city: normalizedCity,
                  referal_links: [{ item_name: getRows3.data.values.slice(1)[index], link: referalLink }], // Assuming the item name is in the same order as the count
                  count: count
              };
          } else {
              mergedData[normalizedCity].referal_links.push({ item_name: getRows3.data.values.slice(1)[index], link: referalLink });
          }
      });

      const result = Object.values(mergedData);

      res.json(result);
  } catch (error) {
      console.error("Error fetching spreadsheet data:", error);
      res.status(500).send("Error fetching spreadsheet data");
  }
});


  app.post("/write-to-sheet2", async (req, res) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'mountain_experiences_bot_key.json',
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();

    const googleSheets = google.sheets({ version: 'v4', auth: client });

    try {
        const getRows1 = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId: process.env.SPREADSHEETS_ID,
            range: "Sheet1!C:D",
        });

        const existingCities = new Set();
        const citiesCount = new Map();
        getRows1.data.values.slice(1).forEach(row => {
            const city = row[0].toLowerCase().replace(/[^a-z]+/g, '');
            if (!existingCities.has(city)) {
                existingCities.add(city);
                citiesCount.set(city, 0); 
            } else {
                citiesCount.set(city, citiesCount.get(city) + 1); 
            }
        });

        const normalizedCities = [];
        
        citiesCount.forEach((count, city) => {
            normalizedCities.push([city, 0]); 
        });

        const requestBody = {
            values: normalizedCities
        };

        const response = await googleSheets.spreadsheets.values.append({
            auth,
            spreadsheetId: process.env.SPREADSHEETS_ID,
            range: `Sheet2!A:B`, 
            valueInputOption: 'RAW',
            resource: requestBody
        });

        //console.log('Normalized cities successfully appended to Sheet2:', response.data);
        res.send('Normalized cities successfully appended to Sheet2');
    } catch (error) {
        console.error("Error writing normalized cities to Sheet2:", error);
        res.status(500).send("Error writing normalized cities to Sheet2");
    }
});

const increaseCount = async (city) => {
  const auth = new google.auth.GoogleAuth({
      keyFile: 'mountain_experiences_bot_key.json',
      scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  try {
      const getRows2 = await googleSheets.spreadsheets.values.get({
          auth,
          spreadsheetId: process.env.SPREADSHEETS_ID,
          range: "Sheet2!A:B",
      });

      const rowsData = getRows2.data.values;

      let cityFound = false;

      rowsData.forEach(row => {
          if (row[0].toLowerCase().replace(/[^a-z]+/g, '') === city.toLowerCase().replace(/[^a-z]+/g, '')) {
              row[1] = (parseInt(row[1]) + 1).toString(); 
              //console.log(row);
              cityFound = true;
          }
      });

      if (!cityFound) {
          throw new Error(`City "${city}" not found in the spreadsheet.`);
      }

      await googleSheets.spreadsheets.values.update({
          auth,
          spreadsheetId: process.env.SPREADSHEETS_ID,
          range: "Sheet2!A:B", 
          valueInputOption: 'RAW',
          resource: { values: rowsData }
      });

      //console.log(`Count for ${city} successfully updated.`);
  } catch (error) {
      console.error(`Error updating count for ${city}:`, error);
      throw  error;
  }
};



app.put("/update-count/:city", async (req, res) => {
  const { city } = req.params;

  try {
      await increaseCount(city);
      res.status(200).send(`Count for ${city} successfully updated.`);
  } catch (error) {
      console.error(`Error updating count for ${city}:`, error);
      res.status(500).send(`Error updating count for ${city}`);
  }
});



app.listen(process.env.PORT, () => console.log(`running on http://localhost:${process.env.PORT}`));

