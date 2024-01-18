# 🚀 Cek Tagihan UMB (Universitas Mercu Buana) Automation

Automate the process of logging in to the Sistem Informasi Akademik (SIA) of Universitas Mercu Buana, fetching study fees (`tagihan`) information, and saving it to an Excel file.

## Prerequisites

- **Python Script**:
  - [Python](https://www.python.org/)
  - Dependencies: `pyppeteer`, `pandas`

    ```bash
    # Install Python dependencies
    pip install -r requirements.txt
    ```

- **JavaScript Script**:
  - [Node.js](https://nodejs.org/)
  - Dependencies: `puppeteer`, `exceljs`, `readline`

    ```bash
    # Install JavaScript dependencies
    npm install
    ```

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/RehanDias/cek-tagihan-umb.git
    ```

2. Navigate to the project directory:

    ```bash
    cd cek-tagihan-umb
    ```

3. **Python Script**:
    - Run the script:

        ```bash
        python login.py
        ```

4. **JavaScript Script**:
    - Run the script:

        ```bash
        node login.js
        ```

## Usage

1. Execute the respective script for your preferred language.
2. Enter your SIA credentials when prompted.
3. The script will log in, navigate to the billing page, and extract study fees information.
4. Extracted data will be saved to an Excel file (`<username>-Tagihan.xlsx`).

## Code Details

### Python Script (`login.py`)

- **`login_and_navigate_to_tagihan`**: Launches a browser, logs in, and navigates to the billing page.
- **`login_with_retry`**: Handles login with a retry mechanism and error checking.
- **`navigate_to_tagihan`**: Navigates to the billing page and extracts study fees information.

### JavaScript Script (`login.js`)

- **`loginAndNavigateToTagihan`**: Launches a Puppeteer browser, logs in, and navigates to the billing page.
- **`loginWithRetry`**: Handles login with a retry mechanism and error checking.
- **`navigateToTagihan`**: Navigates to the billing page, extracts study fees information, and saves it to an Excel file.

## Important Notes

- Ensure your login credentials are entered securely.
- The scripts may need adjustments if the website structure changes.

## Contributing

Contributions are welcome! If you encounter issues or have improvements, feel free to open an issue or submit a pull request.

<div align="center">
  <a href="https://www.instagram.com/rehandiazz/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Instagram&logo=instagram&label=&color=E4405F&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="instagram logo"  />
  </a>
  <a href="https://www.hackerrank.com/magearcanist" target="_blank">
    <img src="https://img.shields.io/static/v1?message=HackerRank&logo=hackerrank&label=&color=2EC866&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="hackerrank logo"  />
  </a>
  <a href="paypal.me/rehandiasp" target="_blank">
    <img src="https://img.shields.io/static/v1?message=PayPal&logo=paypal&label=&color=00457C&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="paypal logo"  />
  </a>
</div>

###

## License 📜

[MIT](https://github.com/RehanDias/tiktok-downloader-console/blob/main/LICENSE)
