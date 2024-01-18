import asyncio
import os
from pyppeteer import launch
import pandas as pd

# Function to clear console screen


async def cls():
    os.system('cls' if os.name == 'nt' else 'clear')

# Main function for login and navigating to billing information


async def login_and_navigate_to_tagihan():
    await cls()
    # Launch browser
    browser = await launch(headless="new")
    page = await browser.newPage()

    try:
        await cls()
        # Navigate to login page
        await page.goto("https://sia.mercubuana.ac.id/gate.php/login", waitUntil="domcontentloaded")
        # Perform login with retry in case of errors
        await login_with_retry(page)
    except Exception as error:
        print(f"Error in login_and_navigate_to_tagihan: {error}")
    finally:
        await browser.close()

# Function to handle login with retries


async def login_with_retry(page):
    try:
        # Get username and password from user
        username = input("Enter your username: ")
        password = input("Enter your password: ")

        # Input username and password on the login page
        await page.type('.username-input', username)
        await page.type('.password-input', password)

        # Click the login button
        await page.click(".bottom-right-login-container .rounded-submit")

        # Wait for a short time to allow the page to load
        await asyncio.sleep(2)

        # Check for login errors
        password_error_selector = ".alert.alert-error"
        has_password_error = await page.evaluate('(selector) => {const errorElement = document.querySelector(selector); return errorElement ? errorElement.innerText.includes("Password anda tidak tepat") : false;}', password_error_selector)

        username_error_selector = ".alert.alert-error"
        has_username_error = await page.evaluate('(selector) => {const errorElement = document.querySelector(selector); return errorElement ? errorElement.innerText.includes("Akun yang anda masukkan tidak tersedia") : false;}', username_error_selector)

        # Handle login errors and retry
        if has_username_error:
            await cls()
            print("Invalid username or account not found.")
            await ask_for_credentials_and_login(page)
            return
        elif has_password_error:
            await cls()
            print("Incorrect password. Please check your password and try again.")
            await ask_for_credentials_and_login(page)
            return

        # If login is successful, navigate to billing information
        await navigate_to_tagihan(page, username)
    except Exception as error:
        print(f"Error during login: {error}")

# Function to handle asking for credentials and login


async def ask_for_credentials_and_login(page):
    try:
        await login_with_retry(page)
    except Exception as error:
        print(f"Error during login retry: {error}")

# Function to navigate to billing information


async def navigate_to_tagihan(page, username):
    try:
        await page.goto("https://sia.mercubuana.ac.id/akad.php/biomhs/lst", waitUntil="domcontentloaded")

        print("Login Success.")
        # Wait for the billing information link to be visible
        await page.waitForSelector("#tagihan_wajibbayar a", visible=True, timeout=10000)
        print("\nMengambil Data Tagihan...\n")

        await asyncio.sleep(2)
        await cls()

        # Get the URL of the billing information page
        tagihan_url = await page.evaluate('(selector) => {const a = document.querySelector(selector); return a ? a.href : null;}', "#tagihan_wajibbayar a")

        # If URL is found, extract and save billing information
        if tagihan_url:
            tagihan_info_pengembangan = await biaya_sumbangan_pengembangan(tagihan_url, page)
            tagihan_info_pendidikan = await biaya_sumbangan_pendidikan(tagihan_url, page)

            save_to_excel(tagihan_info_pengembangan,
                          tagihan_info_pendidikan, username)
        else:
            print("URL Tagihan tidak ditemukan.")
    except Exception as error:
        print(f"Error during navigation to tagihan: {error}")
    finally:
        await page.close()

# Function to extract contribution information for development


async def biaya_sumbangan_pengembangan(url, page):
    try:
        await page.goto(url, waitUntil="domcontentloaded")

        await page.waitForSelector('table[align="center"][width="80%"][border="1"]', visible=True, timeout=30000)

        # Extract information from the billing table
        tagihan_info = await page.evaluate('() => {const rows = document.querySelectorAll(\'table[align="center"][width="80%"][border="1"] tr\'); const TglJadwalBelumBayar = []; rows.forEach((row) => {const columns = row.querySelectorAll("td.text10"); if (columns.length >= 7) {const ang = columns[0].innerText.trim(); const tglJadwal = columns[1].innerText.trim(); const jmlTagihan = columns[2].innerText.trim(); const tglBayar = columns[3].innerText.trim(); const bayarTagihan = columns[4].innerText.trim(); if (!tglBayar && !bayarTagihan) {TglJadwalBelumBayar.push({ang, tglJadwal, jmlTagihan});}}}); const infoTableRows = document.querySelectorAll(\'tr.text10b > td[width="5%"][align="center"][colspan="7"][bgcolor="#ffffff"] > table[align="center"][width="50%"] tr\'); const tagihanData = {}; infoTableRows.forEach((row) => {const keyElement = row.querySelector("td.text10b"); const valueElement = row.querySelector("td.text10b + td.text10b"); if (keyElement && valueElement) {const key = keyElement.innerText.trim(); const value = valueElement.innerText.trim(); tagihanData[key] = value;}}); const result = {TglJadwalBelumBayar}; Object.assign(result, tagihanData); return result;}', )

        # If information is successfully extracted, print and return it
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

            return tagihan_info
        else:
            print("Error: Unable to extract tagihan info. Check the page structure.")
            return None
    except Exception as error:
        print(f"Error extracting tagihan info: {error}")
        return None

# Function to extract contribution information for education


async def biaya_sumbangan_pendidikan(url, page):
    try:
        await page.goto(url, waitUntil="domcontentloaded")

        await page.waitForSelector('table[align="center"][width="80%"][border="1"]', visible=True, timeout=30000)

        # Extract information from the billing table
        tagihan_info = await page.evaluate('() => {const rows = document.querySelectorAll(\'table[align="center"][width="80%"][border="1"] tr\'); const TglJadwalBelumBayar = []; rows.forEach((row) => {const columns = row.querySelectorAll("td.text10"); if (columns.length >= 8) {const ang = columns[0].innerText.trim(); const smt = columns[1].innerText.trim(); const tglJadwal = columns[2].innerText.trim(); const jmlTagihan = columns[3].innerText.trim(); const tglBayar = columns[4].innerText.trim(); const bayarTagihan = columns[5].innerText.trim(); if (!tglBayar && !bayarTagihan) {TglJadwalBelumBayar.push({ang, smt, tglJadwal, jmlTagihan});}}}); const infoTableRows = document.querySelectorAll(\'table[align="center"][width="50%"] tr\'); const tagihanData = {}; infoTableRows.forEach((row) => {const keyElement = row.querySelector("td.text10b"); const valueElement = row.querySelector("td.text10b + td.text10b"); if (keyElement && valueElement) {const key = keyElement.innerText.trim(); const value = valueElement.innerText.trim(); tagihanData[key] = value;}}); const result = {TglJadwalBelumBayar}; Object.assign(result, tagihanData); return result;}', )

        # If information is successfully extracted, print and return it
        if tagihan_info:
            print("------------------------------------------------")
            print("BIAYA SUMBANGAN PENDIDIKAN")
            print(f"Total Tagihan: {tagihan_info['Total Tagihan :']}")
            print(f"Total Pembayaran: {tagihan_info['Total Pembayaran :']}")
            print(f"Saldo: {tagihan_info['Saldo :']}")

            if tagihan_info["TglJadwalBelumBayar"]:
                print("\nTagihan yang belum di bayar:")
                for tagihan in tagihan_info["TglJadwalBelumBayar"]:
                    print(f"Ang: {tagihan['ang']} Smt: {tagihan['smt']} Belum Lunas Di tanggal: {
                          tagihan['tglJadwal']} Jml Tagihan: {tagihan['jmlTagihan']}")
                print("------------------------------------------------")
            else:
                print("\nSUDAH LUNAS. TIDAK PERLU ADA YANG DI BAYAR")
                print("------------------------------------------------")

            return tagihan_info
        else:
            print("Error: Unable to extract tagihan info. Check the page structure.")
            return None
    except Exception as error:
        print(f"Error extracting tagihan info: {error}")
        return None

# Function to save extracted information to an Excel file


def save_to_excel(tagihan_info_pengembangan, tagihan_info_pendidikan, username):
    try:
        filename = f"{username}-tagihan.xlsx"
        with pd.ExcelWriter(filename, engine='xlsxwriter') as writer:
            # Combine Pengembangan and Pendidikan into one sheet
            df_combined = pd.DataFrame()

            # Pengembangan Section
            if 'TglJadwalBelumBayar' in tagihan_info_pengembangan and tagihan_info_pengembangan['TglJadwalBelumBayar']:
                df_pengembangan = pd.DataFrame(
                    tagihan_info_pengembangan['TglJadwalBelumBayar'])
                df_pengembangan_summary = pd.DataFrame({
                    'Tagihan Type': ['Pengembangan - Total Tagihan', 'Pengembangan - Total Pembayaran', 'Pengembangan - Saldo'],
                    'Amount': [tagihan_info_pengembangan['Total Tagihan :'], tagihan_info_pengembangan['Total Pembayaran :'], tagihan_info_pengembangan['Saldo :']]
                })

                # Add Pengembangan Section to combined DataFrame
                df_combined = pd.concat(
                    [df_combined, df_pengembangan_summary, df_pengembangan])

            # Pendidikan Section
            if 'TglJadwalBelumBayar' in tagihan_info_pendidikan and tagihan_info_pendidikan['TglJadwalBelumBayar']:
                df_pendidikan = pd.DataFrame(
                    tagihan_info_pendidikan['TglJadwalBelumBayar'])
                df_pendidikan_summary = pd.DataFrame({
                    'Tagihan Type': ['Pendidikan - Total Tagihan', 'Pendidikan - Total Pembayaran', 'Pendidikan - Saldo'],
                    'Amount': [tagihan_info_pendidikan['Total Tagihan :'], tagihan_info_pendidikan['Total Pembayaran :'], tagihan_info_pendidikan['Saldo :']]
                })

                # Add Pendidikan Section to combined DataFrame
                df_combined = pd.concat(
                    [df_combined, df_pendidikan_summary, df_pendidikan])

            # Save the combined DataFrame to Excel
            df_combined.to_excel(writer, sheet_name='Tagihan',
                                 index=False, header=True, float_format="%.2f")

        print(f"Data saved to {filename}")
    except Exception as error:
        print(f"Error saving data to Excel: {error}")

# Function to ask a question and get input


async def ask_question(question):
    return input(question)

# Main entry point
if __name__ == "__main__":
    asyncio.run(login_and_navigate_to_tagihan())
