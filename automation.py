from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

# Configure Chrome options
chrome_options = Options()
# Uncomment the line below if you want to run headless (without opening browser)
# chrome_options.add_argument("--headless")

# Initialize the driver
# Make sure you have chromedriver installed and in your PATH
# Or specify the path: service = Service('/path/to/chromedriver')
driver = webdriver.Chrome(options=chrome_options)

try:
    # Navigate to your page (replace with your actual URL)
    driver.get("http://localhost:3000/paste-json")  # or your target URL
    
    # Wait for the textarea to be present
    wait = WebDriverWait(driver, 10)
    textarea = wait.until(EC.presence_of_element_located((By.ID, "json-text")))
    
    # Your automation code - paste JSON recipe data
    answer_text = """{
  "id": "recipe-123",
  "name": {
    "en": "Chicken Curry",
    "de": "Hühnchen Curry",
    "nl": "Kip Curry",
    "hu": "Csirke Curry",
    "fr": "Curry de Poulet",
    "es": "Curry de Pollo",
    "pt": "Curry de Frango"
  },
  "description": {
    "en": "A delicious chicken curry recipe"
  },
  "ingredients": [],
  "steps": [],
  "difficulty": 5,
  "servings": 4,
  "time": {
    "prepMinutes": 15,
    "cookMinutes": 30,
    "totalMinutes": 45
  },
  "macros": {
    "calories": 500,
    "protein": 20,
    "carbohydrates": 50,
    "fat": 20
  },
  "mealType": "dinner",
  "cuisineType": "indian"
}"""
    textarea.send_keys(answer_text)
    
    # Wait for submit button and click
    submit_button = wait.until(EC.element_to_be_clickable((By.ID, "submit-button")))
    submit_button.click()
    
    # Wait a bit to see the result (optional)
    time.sleep(2)
    
    print("Automation completed successfully!")
    
except Exception as e:
    print(f"Error occurred: {str(e)}")
    
finally:
    # Close the browser
    driver.quit()
