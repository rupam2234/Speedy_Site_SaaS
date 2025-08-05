const fs = require("fs");
const path = require("path");

const services = require("./services.json");

const domains = new Set();

function extractDomainsFromCategories(categories) {
  for (const categoryName in categories) {
    const servicesArray = categories[categoryName];
    for (const serviceObj of servicesArray) {
      for (const serviceName in serviceObj) {
        const urlToDomains = serviceObj[serviceName];
        for (const url in urlToDomains) {
          const domainList = urlToDomains[url];
          if (Array.isArray(domainList)) {
            domainList.forEach((domain) => domains.add(domain.toLowerCase()));
          } else if (typeof domainList === "string") {
            domains.add(domainList.toLowerCase());
          }
          // else ignore unexpected types
        }
      }
    }
  }
}

extractDomainsFromCategories(services.categories);

const outputPath = path.resolve(__dirname, "../scripts/trackers.json");
fs.writeFileSync(outputPath, JSON.stringify([...domains], null, 2));

console.log(`✅ Extracted ${domains.size} tracker domains to ${outputPath}`);
