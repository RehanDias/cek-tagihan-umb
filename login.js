// Importing necessary libraries
const puppeteer = require("puppeteer");
const readline = require("readline");
const ExcelJS = require("exceljs");

// Creating an interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to initiate login and navigate to the billing page
async function loginAndNavigateToTagihan() {
  // Launching Puppeteer browser
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  try {
    // Navigating to the login page
    await page.goto("https://sia.mercubuana.ac.id/gate.php/login", {
      waitUntil: "domcontentloaded",
    });

    // Clearing console and initiating the login process
    console.clear();
    await loginWithRetry(page);
  } catch (error) {
    console.error("Error in loginAndNavigateToTagihan:", error);
  }
}

// Function to handle login with retry mechanism
async function loginWithRetry(page, username) {
  try {
    // Asking user for username and password
    const enteredUsername = await askQuestion("Enter your username: ");
    const password = await askQuestion("Enter your password: ");

    // Entering username and password on the login page
    await page.type('input[name="username"]', enteredUsername);
    await page.type('input[name="password"]', password);

    // Clicking the login button and waiting for 2 seconds
    await page.click(".bottom-right-login-container .rounded-submit");
    await page.waitForTimeout(2000);

    // Checking for login errors
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

    // Handling login errors and initiating retry if needed
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

    // If login is successful, navigate to billing page
    await navigateToTagihan(page, enteredUsername);
  } catch (error) {
    console.error("Error during login:", error);
  }
}

// Function to handle user input and initiate login retry
async function askForCredentialsAndLogin(page) {
  try {
    await loginWithRetry(page, username);
  } catch (error) {
    console.error("Error during login retry:", error);
  }
}

// Function to navigate to the billing page and extract information
async function navigateToTagihan(page, username) {
  try {
    // Navigating to the billing page
    await page.goto("https://sia.mercubuana.ac.id/akad.php/biomhs/lst", {
      waitUntil: "domcontentloaded",
    });

    // Displaying success message after login
    console.log(`Login Success.`);

    // Waiting for the billing page to load
    await page.waitForSelector("#tagihan_wajibbayar a", {
      visible: true,
      timeout: 10000,
    });
    console.clear();

    // Extracting the URL for the billing page
    const tagihanURL = await page.$eval("#tagihan_wajibbayar a", (a) => a.href);

    // Processing billing information if the URL is found
    if (tagihanURL) {
      const penngembanganInfo = await biayaSumbanganPenngembangan(
        tagihanURL,
        page
      );
      const pendidikanInfo = await biayaSumbanganPendidikan(tagihanURL, page);

      // Passing username and billing information to writeToExcel function
      await writeToExcel(username, [penngembanganInfo, pendidikanInfo]);
    } else {
      console.log(`URL Tagihan tidak ditemukan.`);
    }
  } catch (error) {
    console.error("Error during navigation to tagihan:", error);
  } finally {
    // Closing the Puppeteer page after processing
    await page.close();
  }
}

// Function to extract information related to 'Penngembangan' tagihan
async function biayaSumbanganPenngembangan(url, page) {
  try {
    // Navigate to the specified URL and wait for the page to load
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait for the target table to be visible
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000,
      }
    );

    // Extract tagihan information using page evaluation
    const tagihanInfo = await page.evaluate(() => {
      // Select all rows in the target table
      const rows = document.querySelectorAll(
        'table[align="center"][width="80%"][border="1"] tr'
      );
      const TglJadwalBelumBayar = [];

      // Loop through each row and extract relevant data
      rows.forEach((row) => {
        const columns = row.querySelectorAll("td.text10");

        // Check if the row has enough columns
        if (columns.length >= 7) {
          const ang = columns[0].innerText.trim();
          const tglJadwal = columns[1].innerText.trim();
          const jmlTagihan = columns[2].innerText.trim();
          const tglBayar = columns[3].innerText.trim();
          const bayarTagihan = columns[4].innerText.trim();

          // Check if the tagihan is not paid (tglBayar and bayarTagihan are empty)
          if (!tglBayar && !bayarTagihan) {
            TglJadwalBelumBayar.push({
              ang,
              tglJadwal,
              jmlTagihan,
            });
          }
        }
      });

      // Select additional information from another table
      const infoTableRows = document.querySelectorAll(
        'tr.text10b > td[width="5%"][align="center"][colspan="7"][bgcolor="#ffffff"] > table[align="center"][width="50%"] tr'
      );

      // Create an object to store tagihan data
      const tagihanData = {};

      // Loop through each row and extract key-value pairs
      infoTableRows.forEach((row) => {
        const keyElement = row.querySelector("td.text10b");
        const valueElement = row.querySelector("td.text10b + td.text10b");

        // Check if both key and value elements exist
        if (keyElement && valueElement) {
          const key = keyElement.innerText.trim();
          const value = valueElement.innerText.trim();

          // Store key-value pairs in the tagihanData object
          tagihanData[key] = value;
        }
      });

      // Return an object with tagihan information
      return { type: "Penngembangan", TglJadwalBelumBayar, ...tagihanData };
    });

    // Display extracted information in the console
    if (tagihanInfo) {
      console.log("------------------------------------------------");
      console.log("BIAYA SUMBANGAN PENGEMBANGAN");
      console.log("Total Tagihan:", tagihanInfo["Total Tagihan :"]);
      console.log("Total Pembayaran:", tagihanInfo["Total Pembayaran :"]);
      console.log("Saldo:", tagihanInfo["Saldo :"]);

      // Display unpaid tagihan information if any
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

      // Return the extracted tagihan information
      return tagihanInfo;
    } else {
      console.log(
        "Error: Unable to extract tagihan info. Check the page structure."
      );
      return null;
    }
  } catch (error) {
    // Handle errors during the extraction process
    console.error("Error extracting tagihan info:", error);
    return null;
  }
}

// Function to extract information related to 'Pendidikan' tagihan
async function biayaSumbanganPendidikan(url, page) {
  try {
    // Navigate to the specified URL and wait for the page to load
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Wait for the target table to be visible
    await page.waitForSelector(
      'table[align="center"][width="80%"][border="1"]',
      {
        visible: true,
        timeout: 30000,
      }
    );

    // Extract tagihan information using page evaluation
    const tagihanInfo = await page.evaluate(() => {
      // Select all rows in the target table
      const rows = document.querySelectorAll(
        'table[align="center"][width="80%"][border="1"] tr'
      );
      const TglJadwalBelumBayar = [];

      // Loop through each row and extract relevant data
      rows.forEach((row) => {
        const columns = row.querySelectorAll("td.text10");

        // Check if the row has enough columns
        if (columns.length >= 8) {
          const ang = columns[0].innerText.trim();
          const smt = columns[1].innerText.trim();
          const tglJadwal = columns[2].innerText.trim();
          const jmlTagihan = columns[3].innerText.trim();
          const tglBayar = columns[4].innerText.trim();
          const bayarTagihan = columns[5].innerText.trim();

          // Check if the tagihan is not paid (tglBayar and bayarTagihan are empty)
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

      // Select additional information from another table
      const infoTableRows = document.querySelectorAll(
        'table[align="center"][width="50%"] tr'
      );
      const tagihanData = {};

      // Loop through each row and extract key-value pairs
      infoTableRows.forEach((row) => {
        const keyElement = row.querySelector("td.text10b");
        const valueElement = row.querySelector("td.text10b + td.text10b");

        // Check if both key and value elements exist
        if (keyElement && valueElement) {
          const key = keyElement.innerText.trim();
          const value = valueElement.innerText.trim();

          // Store key-value pairs in the tagihanData object
          tagihanData[key] = value;
        }
      });

      // Return an object with tagihan information
      return { type: "Pendidikan", TglJadwalBelumBayar, ...tagihanData };
    });

    // Display extracted information in the console
    console.log("------------------------------------------------");
    console.log("BIAYA SUMBANGAN PENDIDIKAN");
    console.log("Total Tagihan:", tagihanInfo["Total Tagihan :"]);
    console.log("Total Pembayaran:", tagihanInfo["Total Pembayaran :"]);
    console.log("Saldo:", tagihanInfo["Saldo :"]);

    // Display unpaid tagihan information if any
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

    // Return the extracted tagihan information
    return tagihanInfo;
  } catch (error) {
    // Handle errors during the extraction process
    console.error("Error extracting tagihan info:", error);
    return null;
  }
}

// Function to write extracted data to Excel file
async function writeToExcel(username, tagihanInfos) {
  try {
    const workbook = new ExcelJS.Workbook();
    const combinedWorksheet = workbook.addWorksheet("TAGIHAN");

    tagihanInfos.forEach((tagihanInfo) => {
      // Skip writing if Saldo is 0
      if (parseFloat(tagihanInfo["Saldo :"]) === 0) {
        return;
      }

      // Writing summary for each type of tagihan
      combinedWorksheet.addRow([
        `${tagihanInfo.type} - Total Tagihan`,
        tagihanInfo["Total Tagihan :"],
      ]);
      combinedWorksheet.addRow([
        `${tagihanInfo.type} - Total Pembayaran`,
        tagihanInfo["Total Pembayaran :"],
      ]);

      const saldoRow = `${tagihanInfo.type} - Saldo`;
      combinedWorksheet.addRow([saldoRow, tagihanInfo["Saldo :"]]);

      // Adding an empty row for better separation
      combinedWorksheet.addRow([]);

      // Writing headers for the data
      if (tagihanInfo.type === "Penngembangan") {
        combinedWorksheet.addRow(["Ang", "Tanggal Jadwal", "Jumlah Tagihan"]);
      } else if (tagihanInfo.type === "Pendidikan") {
        combinedWorksheet.addRow([
          "Ang",
          "Smt",
          "Tanggal Jadwal",
          "Jumlah Tagihan",
        ]);
      }

      // Writing data for each type of tagihan
      tagihanInfo.TglJadwalBelumBayar.forEach((tagihan) => {
        const data = [tagihan.ang];
        if (tagihanInfo.type === "Pendidikan") {
          data.push(tagihan.smt);
        }
        data.push(tagihan.tglJadwal, tagihan.jmlTagihan);
        combinedWorksheet.addRow(data);
      });

      // Adding an empty row as a separator between types of tagihan
      combinedWorksheet.addRow([]);
    });

    // Save the workbook to a file
    const fileName = `${username}-Tagihan.xlsx`;
    await workbook.xlsx.writeFile(fileName);
    process.exit();
  } catch (error) {
    console.error("Error writing to Excel:", error);
  }
}

// Function to ask a question and return the user's input
async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Call the loginAndNavigateToTagihan function
loginAndNavigateToTagihan();
