import requests

API_KEY = 'G9KwKq3465588VPd6747t95Zh94q3W2E'
API_URL = 'https://janice.e-351.com/api/rest/v1/pricer'
MARKET = 2  # Jita
ITEMS = ['water']  # 아이템 ID 또는 이름

payload = '\n'.join(ITEMS)
params = {
    'key': API_KEY,
    'market': MARKET,
    '_': '-'
}

response = requests.post(API_URL, params=params, data=payload, headers={'Content-Type': 'text/plain'})
result = response.json()
print(result)