const puppeteer = require("puppeteer");
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function loginAndNavigateToTagihan() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    // Buka halaman login
    await page.goto("https://sia.mercubuana.ac.id/gate.php/login", {
      waitUntil: "domcontentloaded",
    });

    // Isi formulir login
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

    // Klik tombol login
    await page.click(".bottom-right-login-container .rounded-submit");

    // Wait for potential errors after login attempt
    await page.waitForTimeout(2000); // Add a small delay to ensure elements have time to appear

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

    // For Username Error
    if (hasUsernameError) {
      const errorMessage = await page.evaluate((selector) => {
        const errorElement = document.querySelector(selector);
        return errorElement ? errorElement.innerText.trim() : null;
      }, usernameErrorSelector);
      console.clear();
      console.log(`Invalid username or account not found.`);

      // Ask for username and password again
      await askForCredentialsAndLogin(page);
      return;
    } else if (hasPasswordError) {
      const errorMessage = await page.evaluate((selector) => {
        const errorElement = document.querySelector(selector);
        return errorElement ? errorElement.innerText.trim() : null;
      }, passwordErrorSelector);
      console.clear();
      console.log(
        `Incorrect password. Please check your password and try again.`
      );

      // Ask for username and password again
      await askForCredentialsAndLogin(page);
      return;
    }

    // If no errors, proceed with navigation
    await navigateToTagihan(page);
  } catch (error) {
    console.error("Error during login:", error);
  }
}

async function askForCredentialsAndLogin(page) {
  try {
    // Ask for username and password again
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
      await biayaSumbanganPenngembangan(tagihanURL, page);
      await biayaSumbanganPendidikan(tagihanURL, page);
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
    // Buka halaman tagihan
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Tunggu hingga elemen tabel tagihan muncul
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000, // Increase the timeout to 30 seconds or more
      }
    );

    // Ekstrak informasi tagihan
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

          // Handle cells with &nbsp; as empty
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

      // Print all keys and values for debugging
      for (const key in tagihanData) {
        console.log(`${key}: ${tagihanData[key]}`);
      }

      return { TglJadwalBelumBayar, ...tagihanData };
    });

    // Check if tagihanInfo is not null before accessing properties
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
    } else {
      console.log(
        "Error: Unable to extract tagihan info. Check the page structure."
      );
    }
  } catch (error) {
    console.error("Error extracting tagihan info:", error);
  }
}
async function biayaSumbanganPendidikan(url, page) {
  try {
    // Buka halaman tagihan
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Tunggu hingga elemen tabel tagihan muncul
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000, // Increase the timeout to 30 seconds or more
      }
    );

    // Ekstrak informasi tagihan
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

          // Handle cells with &nbsp; as empty
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

      return { TglJadwalBelumBayar, ...tagihanData };
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

    process.exit();
  } catch (error) {
    console.error("Error extracting tagihan info:", error);
  }
}
async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Panggil fungsi loginAndNavigateToTagihan
loginAndNavigateToTagihan();
