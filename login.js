const puppeteer = require("puppeteer");
const readline = require("readline");
const ExcelJS = require("exceljs");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function loginAndNavigateToTagihan() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    await page.goto("https://sia.mercubuana.ac.id/gate.php/login", {
      waitUntil: "domcontentloaded",
    });

    console.clear();
    await loginWithRetry(page);
  } catch (error) {
    console.error("Error in loginAndNavigateToTagihan:", error);
  }
}

async function loginWithRetry(page) {
  try {
    const username = await askQuestion("Enter your username: ");
    const password = await askQuestion("Enter your password: ");

    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);

    await page.click(".bottom-right-login-container .rounded-submit");
    await page.waitForTimeout(2000);

    const passwordErrorSelector = ".alert.alert-error";
    const hasPasswordError = await page.evaluate((selector) => {
      const errorElement = document.querySelector(selector);
      return errorElement
        ? errorElement.innerText.includes("Password anda tidak tepat")
        : false;
    }, passwordErrorSelector);

    const usernameErrorSelector = ".alert.alert-error";
    const hasUsernameError = await page.evaluate((selector) => {
      const errorElement = document.querySelector(selector);
      return errorElement
        ? errorElement.innerText.includes(
            "Akun yang anda masukkan tidak tersedia"
          )
        : false;
    }, usernameErrorSelector);

    if (hasUsernameError) {
      console.clear();
      console.log(`Invalid username or account not found.`);
      await askForCredentialsAndLogin(page);
      return;
    } else if (hasPasswordError) {
      console.clear();
      console.log(
        `Incorrect password. Please check your password and try again.`
      );
      await askForCredentialsAndLogin(page);
      return;
    }

    await navigateToTagihan(page);
  } catch (error) {
    console.error("Error during login:", error);
  }
}

async function askForCredentialsAndLogin(page) {
  try {
    await loginWithRetry(page);
  } catch (error) {
    console.error("Error during login retry:", error);
  }
}

async function navigateToTagihan(page) {
  try {
    await page.goto("https://sia.mercubuana.ac.id/akad.php/biomhs/lst", {
      waitUntil: "domcontentloaded",
    });

    console.log(`Login Success.`);
    await page.waitForSelector("#tagihan_wajibbayar a", {
      visible: true,
      timeout: 10000,
    });
    console.clear();

    const tagihanURL = await page.$eval("#tagihan_wajibbayar a", (a) => a.href);

    if (tagihanURL) {
      const penngembanganInfo = await biayaSumbanganPenngembangan(
        tagihanURL,
        page
      );
      const pendidikanInfo = await biayaSumbanganPendidikan(tagihanURL, page);

      // Save to Excel with both types of fee information
      await writeToExcel([penngembanganInfo, pendidikanInfo]);
    } else {
      console.log(`URL Tagihan tidak ditemukan.`);
    }
  } catch (error) {
    console.error("Error during navigation to tagihan:", error);
  } finally {
    await page.close();
  }
}

async function biayaSumbanganPenngembangan(url, page) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000,
      }
    );

    const tagihanInfo = await page.evaluate(() => {
      const rows = document.querySelectorAll(
        'table[align="center"][width="80%"][border="1"] tr'
      );
      const TglJadwalBelumBayar = [];

      rows.forEach((row) => {
        const columns = row.querySelectorAll("td.text10");

        if (columns.length >= 7) {
          const ang = columns[0].innerText.trim();
          const tglJadwal = columns[1].innerText.trim();
          const jmlTagihan = columns[2].innerText.trim();
          const tglBayar = columns[3].innerText.trim();
          const bayarTagihan = columns[4].innerText.trim();

          if (!tglBayar && !bayarTagihan) {
            TglJadwalBelumBayar.push({
              ang,
              tglJadwal,
              jmlTagihan,
            });
          }
        }
      });

      const infoTableRows = document.querySelectorAll(
        'tr.text10b > td[width="5%"][align="center"][colspan="7"][bgcolor="#ffffff"] > table[align="center"][width="50%"] tr'
      );

      const tagihanData = {};

      infoTableRows.forEach((row) => {
        const keyElement = row.querySelector("td.text10b");
        const valueElement = row.querySelector("td.text10b + td.text10b");

        if (keyElement && valueElement) {
          const key = keyElement.innerText.trim();
          const value = valueElement.innerText.trim();

          tagihanData[key] = value;
        }
      });

      return { type: "Penngembangan", TglJadwalBelumBayar, ...tagihanData };
    });

    if (tagihanInfo) {
      console.log("------------------------------------------------");
      console.log("BIAYA SUMBANGAN PENGEMBANGAN");
      console.log("Total Tagihan:", tagihanInfo["Total Tagihan :"]);
      console.log("Total Pembayaran:", tagihanInfo["Total Pembayaran :"]);
      console.log("Saldo:", tagihanInfo["Saldo :"]);

      if (tagihanInfo.TglJadwalBelumBayar.length > 0) {
        console.log("\nTagihan yang belum di bayar:");
        tagihanInfo.TglJadwalBelumBayar.forEach((tagihan) => {
          console.log(
            `Ang: ${tagihan.ang} Belum Lunas Di tanggal: ${tagihan.tglJadwal} Jml Tagihan: ${tagihan.jmlTagihan}`
          );
        });
        console.log("------------------------------------------------");
      } else {
        console.log("\nTagihan yang belum di bayar:");
        console.log("\nSUDAH LUNAS. TIDAK PERLU ADA YANG DI BAYAR");
        console.log("------------------------------------------------");
      }

      return tagihanInfo;
    } else {
      console.log(
        "Error: Unable to extract tagihan info. Check the page structure."
      );
      return null;
    }
  } catch (error) {
    console.error("Error extracting tagihan info:", error);
    return null;
  }
}

async function biayaSumbanganPendidikan(url, page) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000,
      }
    );

    const tagihanInfo = await page.evaluate(() => {
      const rows = document.querySelectorAll(
        'table[align="center"][width="80%"][border="1"] tr'
      );
      const TglJadwalBelumBayar = [];

      rows.forEach((row) => {
        const columns = row.querySelectorAll("td.text10");

        if (columns.length >= 8) {
          const ang = columns[0].innerText.trim();
          const smt = columns[1].innerText.trim();
          const tglJadwal = columns[2].innerText.trim();
          const jmlTagihan = columns[3].innerText.trim();
          const tglBayar = columns[4].innerText.trim();
          const bayarTagihan = columns[5].innerText.trim();

          if (!tglBayar && !bayarTagihan) {
            TglJadwalBelumBayar.push({
              ang,
              smt,
              tglJadwal,
              jmlTagihan,
            });
          }
        }
      });

      const infoTableRows = document.querySelectorAll(
        'table[align="center"][width="50%"] tr'
      );
      const tagihanData = {};

      infoTableRows.forEach((row) => {
        const keyElement = row.querySelector("td.text10b");
        const valueElement = row.querySelector("td.text10b + td.text10b");

        if (keyElement && valueElement) {
          const key = keyElement.innerText.trim();
          const value = valueElement.innerText.trim();

          tagihanData[key] = value;
        }
      });

      return { type: "Pendidikan", TglJadwalBelumBayar, ...tagihanData };
    });

    console.log("------------------------------------------------");
    console.log("BIAYA SUMBANGAN PENDIDIKAN");
    console.log("Total Tagihan:", tagihanInfo["Total Tagihan :"]);
    console.log("Total Pembayaran:", tagihanInfo["Total Pembayaran :"]);
    console.log("Saldo:", tagihanInfo["Saldo :"]);

    if (tagihanInfo.TglJadwalBelumBayar.length > 0) {
      console.log("\nTagihan yang belum di bayar:\n");
      tagihanInfo.TglJadwalBelumBayar.forEach((tagihan) => {
        console.log(
          `Ang: ${tagihan.ang} Smt: ${tagihan.smt} Belum Lunas Di tanggal: ${tagihan.tglJadwal} Jml Tagihan: ${tagihan.jmlTagihan}`
        );
      });
      console.log("------------------------------------------------");
    } else {
      console.log("\nSUDAH LUNAS. TIDAK PERLU ADA YANG DI BAYAR");
      console.log("------------------------------------------------");
    }

    return tagihanInfo;
  } catch (error) {
    console.error("Error extracting tagihan info:", error);
    return null;
  }
}

async function writeToExcel(tagihanInfos) {
  try {
    const workbook = new ExcelJS.Workbook();
    const combinedWorksheet = workbook.addWorksheet("CombinedSheet");

    tagihanInfos.forEach((tagihanInfo) => {
      // Writing summary for each type of tagihan
      combinedWorksheet.addRow([
        `${tagihanInfo.type} - Total Tagihan`,
        tagihanInfo["Total Tagihan :"],
      ]);
      combinedWorksheet.addRow([
        `${tagihanInfo.type} - Total Pembayaran`,
        tagihanInfo["Total Pembayaran :"],
      ]);
      combinedWorksheet.addRow([
        `${tagihanInfo.type} - Saldo`,
        tagihanInfo["Saldo :"],
      ]);

      // Adding an empty row for better separation
      combinedWorksheet.addRow([]);

      // Writing headers for the data
      combinedWorksheet.addRow([
        "Ang",
        "Smt",
        "Tanggal Jadwal",
        "Jumlah Tagihan",
      ]);

      // Writing data for each type of tagihan
      tagihanInfo.TglJadwalBelumBayar.forEach((tagihan) => {
        combinedWorksheet.addRow([
          tagihan.ang,
          tagihan.smt,
          tagihan.tglJadwal,
          tagihan.jmlTagihan,
        ]);
      });

      // Adding an empty row as a separator between types of tagihan
      combinedWorksheet.addRow([]);
    });

    // Save the workbook to a file
    await workbook.xlsx.writeFile("tagihan_anda_combined.xlsx");
  } catch (error) {
    console.error("Error writing to Excel:", error);
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Call the loginAndNavigateToTagihan function
loginAndNavigateToTagihan();
