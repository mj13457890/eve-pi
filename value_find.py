from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
import time

driver_path = 'chromedriver.exe'
service = Service(driver_path)
driver = webdriver.Chrome(service=service)

driver.get('https://janice.e-351.com/')

input_box = driver.find_element(By.ID, 'pass')
input_box.send_keys('123456')

submit_button = driver.find_element(By.ID, 'submit')
submit_button.click()

time.sleep(2)

output = driver.find_element(By.ID, 'result')
print("결과:", output.text)

driver.quit()