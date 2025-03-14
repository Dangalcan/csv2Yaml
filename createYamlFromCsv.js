const fs = require('fs');
const csv = require('csv-parser');
const yaml = require('js-yaml');
const { argv } = require('node:process');

argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
});

const inputFile = argv[2];
const outputFile = 'output.yaml';
const passwordPrefix = argv[3]
const min = parseInt(argv[4], 10);
const max = parseInt(argv[5], 10);
const numGoldMembers = parseInt(argv[6], 10);
const numPlatinumMembers = parseInt(argv[7], 10);

const data = {};
const orgs = [];
const emailMap = {}; // Map to store emails by organization
const masterUserAssignments = {}; // Track master-user assignments
const providerEmails = {}; // Map to track provider organization emails

fs.createReadStream(inputFile)
  .pipe(csv({ start: 2 }))
  .on('data', (row) => {
    const { surname, name, uvus, email, organization, role } = row;
    const team = organization + ' team'
    // Collect emails grouped by organization
    if (!emailMap[organization]) {
      emailMap[organization] = [];
    }
    emailMap[organization].push(email);

    // Track emails for provider organizations
    if (!providerEmails[organization]) {
      providerEmails[organization] = new Set();
    }
    providerEmails[organization].add(email);

    if (!data[organization]) {
      data[organization] = {
        name: organization,
        code: organization.replace(/ /g, '').toUpperCase(),
        teams: [],
        services: []
      };
    }

    let orgIndex = orgs.findIndex((org) => org.name === organization);
    if (orgIndex === -1) {
      orgIndex = orgs.length;
      orgs.push({
        name: organization,
        code: organization.replace(/ /g, '').toUpperCase(),
        teams: [],
        services: []
      });
    }

    let teamIndex = orgs[orgIndex].teams.findIndex((t) => t.name === team);
    if (teamIndex === -1) {
      orgs[orgIndex].teams.push({
        name: team,
        'x-itop-profiles': [
          { 'x-itop-profile': 'Configuration Manager' },
          { 'x-itop-profile': 'Service Desk Agent' },
          { 'x-itop-profile': 'Support Agent' },
          { 'x-itop-profile': 'Problem Manager' },
          { 'x-itop-profile': 'Service Manager' }
        ],
        members: [],
      });
      teamIndex = orgs[orgIndex].teams.length - 1;
    }

    orgs[orgIndex].teams[teamIndex].members.push({
      name: name + ' ' + surname,
      user: uvus.replace(/ /g, ''),
      email: email,
      "x-itop-external": true,
      roles: [{ name: role ? role : 'petclinic developer' }],
    });
  })
  .on('end', () => {
    const slas = [];

    // Shuffle emails for random assignment
    const allEmails = Object.values(emailMap).flat();
    allEmails.forEach(email => masterUserAssignments[email] = { gold: 0, platinum: 0 });
    
    orgs.forEach((org) => {
      const orgName = org.name;
      const serviceName = `${orgName}-Petclinic`;
      const slaNameGold = `${serviceName}-gold`;
      const slaNamePlatinum = `${serviceName}-platinum`;

      // Define the service
      const service = {
        name: serviceName,
        description: `Servicio de ${orgName}`,
        teams: org.teams.map((team) => ({ name: team.name })),
        customers: [
          {
            name: `${orgName}-client-gold`,
            sla: slaNameGold
          },
          {
            name: `${orgName}-client-platinum`,
            sla: slaNamePlatinum
          }
        ]
      };
      org.services.push(service);

      // Define the SLA
      slas.push({
        name: slaNameGold,
        guarantees: [
          {
            scope: {
              'x-itop-priority': '*',
              'x-itop-request-type': '*'
            },
            objectives: {
              ttr: {
                max: {
                  value: 48,
                  unit: 'hours'
                }
              },
              tto: {
                max: {
                  value: 48,
                  unit: 'hours'
                }
              }
            }
          }
        ]
      });

      slas.push({
        name: slaNamePlatinum,
        guarantees: [
          {
            scope: {
              'x-itop-priority': '*',
              'x-itop-request-type': '*'
            },
            objectives: {
              ttr: {
                max: {
                  value: 24,
                  unit: 'hours'
                }
              },
              tto: {
                max: {
                  value: 24,
                  unit: 'hours'
                }
              }
            }
          }
        ]
      });

      // Add consumers (new organizations with specific users)
      const consumers = [
        {
          name: `${orgName}-client-gold`,
          code: `${orgName.replace(/ /g, '').toUpperCase()}-GOLD`,
          teams: [
            {
              name: `${orgName} Gold clients team`,
              'x-itop-profiles': [
                { 'x-itop-profile': 'Portal power user' },
                { 'x-itop-profile': 'Portal user' }
              ],
              members: generateClientMembers('gold', orgName)
            }
          ]
        },
        {
          name: `${orgName}-client-platinum`,
          code: `${orgName.replace(/ /g, '').toUpperCase()}-PLATINUM`,
          teams: [
            {
              name: `${orgName} Platinum clients team`,
              'x-itop-profiles': [
                { 'x-itop-profile': 'Portal power user' },
                { 'x-itop-profile': 'Portal user' }
              ],
              members: generateClientMembers('platinum', orgName)
            }
          ]
        }
      ];
      orgs.push(...consumers);
    });

    function generateClientMembers(type, clientOrgName) {
      const members = [];
      if(type === 'gold'){
        for (let i = 1; i <= numGoldMembers; i++) {
          const memberCode = `${clientOrgName}-G${i}`;
          members.push({
            name: memberCode,
            user: memberCode,
            email: `${clientOrgName.toLowerCase()}g${i}@example.com`,
            roles: [{ name: `itop${type.charAt(0).toUpperCase() + type.slice(1)}ClientUser` }],
            'x-itop-default-password': passwordPrefix + getValidMasterUserEmail(type, clientOrgName)
          });
        }
      }
      if(type === 'platinum'){
        for (let i = 1; i <= numPlatinumMembers; i++) {
          const memberCode = `${clientOrgName}-P${i}`;
          members.push({
            name: memberCode,
            user: memberCode,
            email: `${clientOrgName.toLowerCase()}p${i}@example.com`,
            roles: [{ name: `itop${type.charAt(0).toUpperCase() + type.slice(1)}ClientUser` }],
            'x-itop-default-password': passwordPrefix + getValidMasterUserEmail(type, clientOrgName)
          });
        }
      }
      return members;
    }

    function getValidMasterUserEmail(type, clientOrgName) {
      let validEmails = allEmails.filter(email => !providerEmails[clientOrgName].has(email));
      let selectedEmail = validEmails.filter(email => (masterUserAssignments[email]['platinum'] + masterUserAssignments[email]['gold']) < min);
 
      if (selectedEmail.length == 0) {
        selectedEmail = validEmails.filter(email => (masterUserAssignments[email]['platinum'] + masterUserAssignments[email]['gold']) < max);
      }
      if (selectedEmail.length == 0) {
        selectedEmail = validEmails[Math.floor(Math.random() * validEmails.length)];
      } else {
        selectedEmail = selectedEmail[Math.floor(Math.random() * selectedEmail.length)];
      }
      masterUserAssignments[selectedEmail][type]++;
      return selectedEmail;
    }

    const yamlData = {
      context: { id: 1, version: 1, config: { 'service-chain-type': 'faceted' }, 'chain-name': "PSG2 Petclinic model", description: "This is the service chain model from PSG2 subject" },
      orgs,
      sla: slas
    };

    const yamlString = yaml.dump(yamlData, { lineWidth: -1 });

    fs.writeFileSync(outputFile, yamlString);
    console.log('YAML successfully created:', outputFile);
  })
  .on('error', (err) => {
    console.error('There was an error during the generation:', err.message);
  });
