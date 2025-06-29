from flask import Flask, jsonify, request, send_from_directory
import pytz
from datetime import datetime
import geopandas as gpd
from shapely.geometry import Point
import json
import os

app = Flask(__name__, static_folder='client', template_folder='client')

# Thêm header CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST')
    return response

# Tải danh sách quốc gia và múi giờ
with open('countries.json', 'r') as f:
    countries = json.load(f)

# Tải Shapefile
shp_path = os.path.join(os.path.dirname(__file__), 'ne_110m_admin_0_countries.shp')
print(f"Looking for file: {shp_path}")
if not os.path.exists(shp_path):
    raise FileNotFoundError(f"File {shp_path} does not exist")
world = gpd.read_file(shp_path)

# Route để phục vụ index.html
@app.route('/')
def serve_index():
    return send_from_directory('client', 'index.html')

# Route để phục vụ các file tĩnh khác (CSS, JS)
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
    point = Point(lng, lat)  # Shapely dùng (lng, lat)

    # Tìm quốc gia chứa tọa độ
    for _, row in world.iterrows():
        if row['geometry'].contains(point):
            country_code = row.get('ISO_A2', '').upper()
            print(f"Found country code: {country_code} at lat={lat}, lng={lng}")  # Debug
            for country in countries:
                if country['code'].upper() == country_code:
                    tz = pytz.timezone(country['timezone'])
                    current_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")
                    return jsonify({
                        "country": country['name'],
                        "time": current_time,
                        "country_code": country['code']
                    })
    print(f"No country found at lat={lat}, lng={lng}")  # Debug
    return jsonify({"error": "No country found at coordinates"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)