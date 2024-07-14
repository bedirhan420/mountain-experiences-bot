require('dotenv').config();
const url = `http://localhost:${process.env.PORT}`;

const fetchData = async () => {
  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      throw error;
    });
};

const fetchCitiesData = async () => {
  try {
    const data = await fetchData();
    const cities = data.filter((item) => item.city).map((item) => item.city); 
  
    const sortedCities = cities.sort(function(a, b){return a.localeCompare(b)});
    console.log(sortedCities.length)
    return sortedCities;
  } catch (error) {
    console.error("Error:", error);
  }
};


module.exports = {fetchCitiesData, fetchData};

