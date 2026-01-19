from flask import Blueprint, request, jsonify
from app.services.free_service import FreeService
from pydantic import ValidationError
import json

main_bp = Blueprint('main', __name__)

@main_bp.route('/process-file', methods=['POST'])
def process_file():
    """
    Free Mode: Uploads a JSON file and returns stats on the fly.
    Stateless operation.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.endswith('.json'):
         return jsonify({"error": "Invalid file type. Please upload a JSON file."}), 400

    try:
        content = json.load(file)
        stats = FreeService.process_file_content(content)
        return jsonify(stats)
    except json.JSONDecodeError:
         return jsonify({"error": "Invalid JSON format"}), 400
    except ValidationError as e:
        return jsonify({"error": "Validation Error", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main_bp.route('/transactions', methods=['GET', 'POST'])
def transactions():
    # Placeholder for Paid Mode
    return jsonify({"message": "Paid mode feature coming soon"}), 501
