import asyncio
import os
from pyppeteer import launch

# Function to clear console screen


async def cls():
    os.system('cls' if os.name == 'nt' else 'clear')

# Main function for login and navigating to tagihan


async def login_and_navigate_to_tagihan():
    await cls()  # Clear console before starting
    browser = await launch(headless="new")
    page = await browser.newPage()

    try:
        await cls()  # Clear console before login attempt
        await page.goto("https://sia.mercubuana.ac.id/gate.php/login", waitUntil="domcontentloaded")
        await login_with_retry(page)
    except Exception as error:
        print(f"Error in login_and_navigate_to_tagihan: {error}")
    finally:
        await browser.close()

# Function to handle login with retry logic


async def login_with_retry(page):
    try:
        username = input("Enter your username: ")
        password = input("Enter your password: ")

        # Type username and password into the input fields
        await page.type('.username-input', username)
        await page.type('.password-input', password)

        # Click login button
        await page.click(".bottom-right-login-container .rounded-submit")

        # Wait for potential errors after login attempt
        await asyncio.sleep(2)

        # Check for username and password errors
        password_error_selector = ".alert.alert-error"
        has_password_error = await page.evaluate('(selector) => {const errorElement = document.querySelector(selector); return errorElement ? errorElement.innerText.includes("Password anda tidak tepat") : false;}', password_error_selector)

        username_error_selector = ".alert.alert-error"
        has_username_error = await page.evaluate('(selector) => {const errorElement = document.querySelector(selector); return errorElement ? errorElement.innerText.includes("Akun yang anda masukkan tidak tersedia") : false;}', username_error_selector)

        # Handle errors and retry login if needed
        if has_username_error:
            await cls()  # Clear console before starting
            print("Invalid username or account not found.")
            await ask_for_credentials_and_login(page)
            return
        elif has_password_error:
            await cls()  # Clear console before starting
            print("Incorrect password. Please check your password and try again.")
            await ask_for_credentials_and_login(page)
            return

        await navigate_to_tagihan(page)
    except Exception as error:
        print(f"Error during login: {error}")

# Function to ask for credentials and retry login


async def ask_for_credentials_and_login(page):
    try:
        await login_with_retry(page)
    except Exception as error:
        print(f"Error during login retry: {error}")

# Function to navigate to the tagihan page


async def navigate_to_tagihan(page):
    try:
        await page.goto("https://sia.mercubuana.ac.id/akad.php/biomhs/lst", waitUntil="domcontentloaded")

        print("Login Success.")
        await page.waitForSelector("#tagihan_wajibbayar a", visible=True, timeout=10000)
        print("\nMengabil Data Tagihan...\n")

        # Add a waiting period (e.g., 2 seconds) before clearing the console
        await asyncio.sleep(2)
        await cls()  # Clear console before starting

        tagihan_url = await page.evaluate('(selector) => {const a = document.querySelector(selector); return a ? a.href : null;}', "#tagihan_wajibbayar a")

        if tagihan_url:
            await biaya_sumbangan_pengembangan(tagihan_url, page)
            await biaya_sumbangan_pendidikan(tagihan_url, page)
        else:
            print("URL Tagihan tidak ditemukan.")
    except Exception as error:
        print(f"Error during navigation to tagihan: {error}")
    finally:
        await page.close()

# Function to extract and display biaya sumbangan pengembangan


async def biaya_sumbangan_pengembangan(url, page):
    try:
        await page.goto(url, waitUntil="domcontentloaded")

        # Wait for the tagihan table to appear
        await page.waitForSelector('table[align="center"][width="80%"][border="1"]', visible=True, timeout=30000)

        # Extract tagihan information
        tagihan_info = await page.evaluate('() => {const rows = document.querySelectorAll(\'table[align="center"][width="80%"][border="1"] tr\'); const TglJadwalBelumBayar = []; rows.forEach((row) => {const columns = row.querySelectorAll("td.text10"); if (columns.length >= 7) {const ang = columns[0].innerText.trim(); const tglJadwal = columns[1].innerText.trim(); const jmlTagihan = columns[2].innerText.trim(); const tglBayar = columns[3].innerText.trim(); const bayarTagihan = columns[4].innerText.trim(); if (!tglBayar && !bayarTagihan) {TglJadwalBelumBayar.push({ang, tglJadwal, jmlTagihan});}}}); const infoTableRows = document.querySelectorAll(\'tr.text10b > td[width="5%"][align="center"][colspan="7"][bgcolor="#ffffff"] > table[align="center"][width="50%"] tr\'); const tagihanData = {}; infoTableRows.forEach((row) => {const keyElement = row.querySelector("td.text10b"); const valueElement = row.querySelector("td.text10b + td.text10b"); if (keyElement && valueElement) {const key = keyElement.innerText.trim(); const value = valueElement.innerText.trim(); tagihanData[key] = value;}}); return {TglJadwalBelumBayar, ...tagihanData};}', )

        if tagihan_info:
            print("------------------------------------------------")
            print("BIAYA SUMBANGAN PENGEMBANGAN")
            print(f"Total Tagihan: {tagihan_info['Total Tagihan :']}")
            print(f"Total Pembayaran: {tagihan_info['Total Pembayaran :']}")
            print(f"Saldo: {tagihan_info['Saldo :']}")

            if tagihan_info["TglJadwalBelumBayar"]:
                print("\nTagihan yang belum di bayar:")
                for tagihan in tagihan_info["TglJadwalBelumBayar"]:
                    print(f"Ang: {tagihan['ang']} Belum Lunas Di tanggal: {
                          tagihan['tglJadwal']} Jml Tagihan: {tagihan['jmlTagihan']}")
                print("------------------------------------------------")
            else:
                print("\nTagihan yang belum di bayar:")
                print("\nSUDAH LUNAS. TIDAK PERLU ADA YANG DI BAYAR")
                print("------------------------------------------------")
        else:
            print("Error: Unable to extract tagihan info. Check the page structure.")
    except Exception as error:
        print(f"Error extracting tagihan info: {error}")

# Function to extract and display biaya sumbangan pendidikan


async def biaya_sumbangan_pendidikan(url, page):
    try:
        await page.goto(url, waitUntil="domcontentloaded")

        # Wait for the tagihan table to appear
        await page.waitForSelector('table[align="center"][width="80%"][border="1"]', visible=True, timeout=30000)

        # Extract tagihan information
        tagihan_info = await page.evaluate('() => {const rows = document.querySelectorAll(\'table[align="center"][width="80%"][border="1"] tr\'); const TglJadwalBelumBayar = []; rows.forEach((row) => {const columns = row.querySelectorAll("td.text10"); if (columns.length >= 8) {const ang = columns[0].innerText.trim(); const smt = columns[1].innerText.trim(); const tglJadwal = columns[2].innerText.trim(); const jmlTagihan = columns[3].innerText.trim(); const tglBayar = columns[4].innerText.trim(); const bayarTagihan = columns[5].innerText.trim(); if (!tglBayar && !bayarTagihan) {TglJadwalBelumBayar.push({ang, smt, tglJadwal, jmlTagihan});}}}); const infoTableRows = document.querySelectorAll(\'table[align="center"][width="50%"] tr\'); const tagihanData = {}; infoTableRows.forEach((row) => {const keyElement = row.querySelector("td.text10b"); const valueElement = row.querySelector("td.text10b + td.text10b"); if (keyElement && valueElement) {const key = keyElement.innerText.trim(); const value = valueElement.innerText.trim(); tagihanData[key] = value;}}); return {TglJadwalBelumBayar, ...tagihanData};}', )

        print("------------------------------------------------")
        print("BIAYA SUMBANGAN PENDIDIKAN")
        print(f"Total Tagihan: {tagihan_info['Total Tagihan :']}")
        print(f"Total Pembayaran: {tagihan_info['Total Pembayaran :']}")
        print(f"Saldo: {tagihan_info['Saldo :']}")

        if tagihan_info["TglJadwalBelumBayar"]:
            print("\nTagihan yang belum di bayar:\n")
            for tagihan in tagihan_info["TglJadwalBelumBayar"]:
                print(f"Ang: {tagihan['ang']} Smt: {tagihan['smt']} Belum Lunas Di tanggal: {
                      tagihan['tglJadwal']} Jml Tagihan: {tagihan['jmlTagihan']}")
            print("------------------------------------------------")
        else:
            print("\nSUDAH LUNAS. TIDAK PERLU ADA YANG DI BAYAR")
            print("------------------------------------------------")

        exit()
    except Exception as error:
        print(f"Error extracting tagihan info: {error}")

# Function to ask a question and get input


async def ask_question(question):
    return input(question)

# Call the login_and_navigate_to_tagihan function
if __name__ == "__main__":
    asyncio.run(login_and_navigate_to_tagihan())
