from flask import Flask, jsonify, request, send_from_directory
import pytz
from datetime import datetime
import geopandas as gpd
from shapely.geometry import Point
import json
import os
import requests

# --- CẤU HÌNH ---
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__, static_folder=os.path.join(base_dir, 'client'), template_folder=os.path.join(base_dir, 'client'))

API_KEY = '0e9b2101808eadb1e39a525b043c7a9b'  # 🔁 Nhớ thay bằng API thật

# --- CORS ---
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST')
    return response

# --- Load dữ liệu ---
with open('countries.json', 'r') as f:
    countries = json.load(f)

shp_path = os.path.join(os.path.dirname(__file__), 'ne_110m_admin_0_countries.shp')
world = gpd.read_file(shp_path)

# --- ROUTES ---

@app.route('/')
def serve_index():
    return send_from_directory('client', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('client', path)

@app.route('/countries', methods=['GET'])
def get_countries():
    return jsonify(countries)

@app.route('/time/<country_code>', methods=['GET'])
def get_time(country_code):
    for country in countries:
        if country['code'].upper() == country_code.upper():
            tz = pytz.timezone(country['timezone'])
            current_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
            return jsonify({"country": country['name'], "time": current_time, "country_code": country['code']})
    return jsonify({"error": "Country not found"}), 404

@app.route('/time-by-coordinates', methods=['POST'])
def get_time_by_coordinates():
    data = request.get_json()
    lat, lng = float(data['lat']), float(data['lng'])
    point = Point(lng, lat)

    for _, row in world.iterrows():
        if row['geometry'].intersects(point):
            country_code = row.get('ISO_A2', '').upper()
            for country in countries:
                if country['code'].upper() == country_code:
                    tz = pytz.timezone(country['timezone'])
                    current_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
                    return jsonify({
                        "country": country['name'],
                        "time": current_time,
                        "country_code": country['code']
                    })
    return jsonify({"error": "No country found at coordinates"}), 404

@app.route('/weather', methods=['POST'])
def get_weather():
    data = request.get_json()
    lat = data['lat']
    lon = data['lon']
    
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=vi&appid=0e9b2101808eadb1e39a525b043c7a9b"
    response = requests.get(url)

    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({'error': 'Không lấy được thời tiết'}), 400

# --- MAIN ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
