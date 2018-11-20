require('shelljs/global');
const args = require('minimist')(process.argv.slice(2));
const csv = require('fast-csv');
const flatmap = require('flatmap');
const fs = require('fs');

if (!which('az')) {
  console.error('This script requires the Microsoft Azure CLI (az).');
  exit(1);
}

if (!args.file) {
  args.file = `output-${new Date().toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\./g, '')}.csv`;

  console.log(`--file not specified, using ${args.file}`);
}

function run(str) {
  console.log(`Running: ${str}`);
  return JSON.parse(exec(str, { silent: true }).stdout);
}

const webApps = [];

// For each web app of the current subscription
// To change subscriptions use `az account set --subscription`
const azureWebAppList = run(`az webapp list`);

azureWebAppList.forEach((x, i) => {
  const config = run(`az webapp config show --resource-group ${x.resourceGroup} --name ${x.name}`);
  const appSettings = run(`az webapp config appsettings list --resource-group ${x.resourceGroup} --name ${x.name}`);
  const connectionStrings = run(`az webapp config connection-string list --resource-group ${x.resourceGroup} --name ${x.name}`);

  webApps.push({
    name: x.name,
    resourceGroup: x.resourceGroup,
    config: config,
    appSettings: appSettings,
    connectionStrings: connectionStrings
  });

  console.log(`${i + 1} / ${azureWebAppList.length} completed`);
});

webApps.sort((a, b) => a.name.localeCompare(b.name));

// Gather settings collections
const uniqueConfigItems = [...new Set(flatmap(webApps, x => Object.keys(x.config)))].sort((a, b) => a.localeCompare(b));
const uniqueAppSettings = [...new Set(flatmap(webApps, x => x.appSettings).map(x => x.name))].sort((a, b) => a.localeCompare(b));
const uniqueConnectionStrings = [...new Set(flatmap(webApps, x => x.connectionStrings).map(x => x.name))].sort((a, b) => a.localeCompare(b));

// Write CSV to args.file
console.log(`Writing to ${args.file} ...`);

const csvStream = csv.createWriteStream({ headers: false });
const fileStream = fs.createWriteStream(args.file, { encoding: 'utf8' });
csvStream.pipe(fileStream);

const headers = [''].concat(webApps.map(x => x.name));
csvStream.write(headers);

uniqueConfigItems.forEach(x => {
  const row = [x].concat(webApps.map(y => JSON.stringify((y.config[x]))));

  csvStream.write(row);
});

uniqueAppSettings.forEach(x => {
  const row = [`AppSetting: ${x}`].concat(webApps.map(y => {
    const appSetting = y.appSettings.find(z => z.name === x);
    return appSetting ? appSetting.value : '';
  }));

  csvStream.write(row);
});

uniqueConnectionStrings.forEach(x => {
  const row = [`ConnectionString: ${x}`].concat(webApps.map(y => {
    const connectionString = y.connectionStrings.find(z => z.name === x);
    return connectionString ? connectionString.value.value : '';
  }));

  csvStream.write(row);
});

csvStream.end();
