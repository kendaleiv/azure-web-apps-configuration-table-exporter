# Azure Web Apps Configuration Table Exporter

Create CSV of configuration, app settings, and connection strings for all Azure Web Apps in the current Azure CLI subscription.

## Usage

- Install Azure CLI (`az`)
- Login with Azure CLI (`az login`), ensure correct subscription is set

```
> npm install
> node ./index.js --file output.csv
```

## License

MIT
