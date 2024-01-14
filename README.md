# Universitas Mercu Buana SIA Tagihan Automation 🎓💻

## Overview

This script automates the login process and retrieves information about study fees (`tagihan`) from the Sistem Informasi Akademik (Academic Information System) of Universitas Mercu Buana. Two versions of the script are available: one in JavaScript (`login.js`) using Puppeteer and the other in Python (`login.py`) using Pyppeteer.

## Usage

### JavaScript Version (`login.js`) 🟢

#### Installation

1. Install [Node.js](https://nodejs.org/).
2. Open a terminal and navigate to the project directory.
3. Run `npm install` to install the required packages.

#### Execution

1. Run the script using the command: `node login.js`.
2. Follow the prompts to enter your username and password when prompted.

### Python Version (`login.py`) 🐍

#### Installation

1. Install [Python](https://www.python.org/).
2. Open a terminal and navigate to the project directory.
3. Run `pip install pyppeteer` to install the required packages.

#### Execution

1. Run the script using the command: `python login.py`.
2. Enter your username and password when prompted.

## Checking Study Fees (`Tagihan`) 💰

### JavaScript Version (`login.js`)

In the JavaScript version (`login.js`), the script checks and displays information about the study fees related to "Biaya Sumbangan Pendidikan" and "Biaya Sumbangan Pengembangan" separately.

### Python Version (`login.py`)

In the Python version (`login.py`), the script also checks and displays information about the study fees related to "Biaya Sumbangan Pendidikan" and "Biaya Sumbangan Pengembangan" separately.

## Dependencies 📦

### JavaScript Version:

- [Node.js](https://nodejs.org/)
- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [Readline](https://nodejs.org/api/readline.html)

### Python Version:

- [Python](https://www.python.org/)
- [Pyppeteer](https://github.com/miyakogi/pyppeteer)

## Important Note ⚠️

Both scripts are tailored for the specific structure of the login page and tagihan information on the Universitas Mercu Buana SIA. Any changes to the website structure may require modifications to the script.


## License 📜

This project is licensed under the [MIT License](LICENSE).
