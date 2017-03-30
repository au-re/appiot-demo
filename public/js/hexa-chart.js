/* global d3 superagent env */

const svg       = d3.select('svg');
const g         = svg.append('g');
const columns   = 1;
const rows      = 1;
const hexRadius = 80;

const hexbin = d3.hexbin().radius(hexRadius);
const color  = d3.scaleSequential(d3.interpolateHslLong('steelblue',  'orange'));

const points = [];
for (let i = 0; i < rows; i++) {
  for (let j = 0; j < columns; j++) {
    points.push([hexRadius * j * 1.75+160, hexRadius * i * 1.5+160]);
  }
}

g.append('g')
  .attr('class', 'hexagon')
  .selectAll('path')
  .data(hexbin(points))
  .enter().append('path')
  .attr('class', 'hexagon')
  .attr('d', (d) => 'M' + (d.x-hexRadius) + ',' + d.y + hexbin.hexagon())
  .attr('stroke', () => '#fff')
  .attr('stroke-width', '1px')
  .attr('fill', () => color(d3.randomUniform(0.0,1.0)()));

const apiKey = env.API_KEY;
const apiBase = 'https://eappiot-api.sensbysigma.com';

// get the device network
const getDeviceNetwork = new Promise((resolve, reject) => {
  superagent
    .get(apiBase +'/api/v2/deviceNetwork')
    .set('Authorization', 'Bearer ' + apiKey)
    .end((err, res) => {
      if (err || !res.ok || !res.body.Id) reject('error!');
      resolve(res.body);
    });
});

// get the device location
const getLocation = getDeviceNetwork
  .then(deviceNetwork => {
    console.log('getting the location');
    return new Promise((resolve, reject) => {
      superagent
        .get(apiBase +'/clientapi/v1/locations')
        .set('Authorization', 'Bearer ' + apiKey)
        .set('X-DeviceNetwork', deviceNetwork)
        .end((err, res) => {
          if (err || !res.ok) reject('error!');
          if (!res.body.length) reject('error, no location');
          resolve(res.body[0]);
        });
    });
  });

// get the device
Promise.all([getDeviceNetwork, getLocation])
.then(values => {
  const deviceNetwork = values[0];
  const location      = values[1];
  console.log('getting the device ', deviceNetwork,  ' location ', location.Id);
  return new Promise((resolve, reject) => {
    superagent
      .get(apiBase +'/clientapi/v1/locations/'+location.Id+'/sensorCollections')
      .set('Authorization', 'Bearer ' + apiKey)
      .set('X-DeviceNetwork', deviceNetwork)
      .end((err, res) => {
        if (err || !res.ok) reject('Oh no! error', err);
        if (!res.body.Rows.length) reject('Oh no! not found');
        resolve([deviceNetwork, location, res.body.Rows[0]]);
      });
  });
})

// get the device values and update the viz
.then(values => {
  setInterval( () => {
    superagent
      .get(apiBase +'/clientapi/v1/sensorcollections/'+values[2].Id +'/sensors')
      .set('Authorization', 'Bearer ' + apiKey)
      .set('X-DeviceNetwork', values[0])
      .end((err, res) => {
        if (err || !res.ok) return alert('Oh no! so close!');
        if (!res.body.length) return alert('not found');
        if (!res.body[0].LatestMeasurement.Values.length) return alert('no value');
        const measurements = res.body;

        let steam = 0;
        let humidity = 0;
        let temp = 0;

        measurements.forEach(measurement => {
          if(measurement.SensorTypeName === 'Steam Density') {
            steam = measurement.LatestMeasurement.Values[0];
          }
          if(measurement.SensorTypeName === 'Temperature') {
            temp = measurement.LatestMeasurement.Values[0];
          }
          if(measurement.SensorTypeName === 'Humidity') {
            humidity = measurement.LatestMeasurement.Values[0];
          }
        });

        console.log(steam, humidity, temp);
        g.selectAll('.hexagon')
          .attr('fill', () => color(temp))
          .selectAll('path')
          .attr('d', (d) => 'M' + (d.x-hexRadius) + ',' + d.y + d3.hexbin().radius(humidity).hexagon());
      });
  }, 1000);
})
.catch(err => console.log(err));
