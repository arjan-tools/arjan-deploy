require('dotenv').config();
var AWS = require('aws-sdk');
var acm = new AWS.ACM({apiVersion: '2015-12-08'});
var dns = require('@torus-tools/domains')
var {AcmCertificate} = require('./resourceExists')

function createCertificate(domain){
  return new Promise((resolve, reject) => {
    AcmCertificate(domain).then(data=>{
      if(data) resolve(data)
      else {
        var params = {
          DomainName: domain, /* required */
          DomainValidationOptions: [
            {
              DomainName: domain,
              ValidationDomain: domain,
            },
          ],
          SubjectAlternativeNames: [
            `*.${domain}`,
          ],
          ValidationMethod: 'DNS'
        };
        acm.requestCertificate(params).promise()
        .then(data=>resolve(data.CertificateArn))
        .catch(err=>reject(err))
      }
    }).catch(err=>reject(err))
  })
}


function getCname(certificateArn){
  return new Promise((resolve, reject) => {
    var params = {CertificateArn: certificateArn};
    acm.describeCertificate(params).promise()
    .then(data=> {
      if(data.Certificate.DomainValidationOptions[0].ResourceRecord){
        let cName = data.Certificate.DomainValidationOptions[0].ResourceRecord.Name;
        let cValue = data.Certificate.DomainValidationOptions[0].ResourceRecord.Value;
        resolve({"cName": cName, "cValue": cValue});
      }
      else reject('error no CNAME available for the given certificate')
    })
  })  
}

function validateCertificate(config, cName, cValue) {
  return new Promise((resolve, reject) => {
    let records = [
      {
        data: cValue,
        name: cName,
        type: 'CNAME'
      }
    ]
    dns[config.providers.dns].upsertRecords(domain, records)
    .then(resolve('All Done!'))
    .catch(err=>reject(err))
  })
}

module.exports = {
  createCertificate,
  getCname,
  validateCertificate,
}