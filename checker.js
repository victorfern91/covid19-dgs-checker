const notifier = require('node-notifier');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const download = require('download');

const nc = new notifier.NotificationCenter();

const blockUnneededRequest = req => {
    const resourceType = req.resourceType();

    if(resourceType === 'image'
        || resourceType === 'stylesheet'
        || resourceType === 'script'
        || resourceType === 'font'
    ) {
        req.abort();
    }
    else {
        req.continue();
    }
};

async function run() {
    let browser = await puppeteer.launch({ headless: true });
    let page = await browser.newPage();
    await page.setRequestInterception(true);
    let reportsNumber = 0;

    page.on('request', blockUnneededRequest);

    await page.goto('https://covid19.min-saude.pt/relatorio-de-situacao/', { waitUntil: ['networkidle0', 'domcontentloaded'] });

    cron.schedule('*/5 * * * * *', async () => {
        await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });

        const list = await page.$$('ul > li > a');

        if (list.length > reportsNumber) {
            reportsNumber = list.length;

            const file = await(await list[0].getProperty('href')).jsonValue();

            await download(file, './reports', { filename: 'report.pdf' });

            nc.notify(
                {
                    title: 'Covid-19 Report Checker!',
                    message: 'New report from DGS found!',
                    sound: 'Funk',
                    wait: true,
                    open: `file://${__dirname}/reports/report.pdf`
                }
            );
        }
    });
}

run();
