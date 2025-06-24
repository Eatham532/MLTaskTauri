import json
import os

class Store:
    def __init__(self, folder, name = "store"):
        self.folder = folder
        self.path = os.path.join(folder, name + ".json")

        os.mkdir(self.path) if not os.path.exists(folder) else None

        if not os.path.exists(self.path):
            with open(self.path, 'w') as f:
                f.write('{filePath:None}')

    def get_path(self):
        return self.path

    def get_value(self, key):
        try:
            with open(self.path, 'r') as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            data = {}
        return data.get(key, None)

    def set_value(self, key, value):
        try:
            with open(self.path, 'r') as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            data = {}
        data[key] = value
        with open(self.path, 'w') as f:
            json.dump(data, f)