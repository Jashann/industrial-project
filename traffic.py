#!/usr/bin/env python3
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import transform
from shapely.validation import make_valid as shapely_make_valid  # If available
from typing import List, Dict

# --------------------------------------------------------------------
# 1. Toy "traffic control" parameter table (distances in meters).
TRAFFIC_CONTROL_TABLE = {
    50: {"A": 50,  "L": 30,  "B": 35, "D":  9, "barrels_in_taper": 5},
    60: {"A": 50,  "L": 40,  "B": 45, "D":  9, "barrels_in_taper": 5},
    70: {"A": 75,  "L": 60,  "B": 50, "D": 10, "barrels_in_taper": 6},
    80: {"A": 100, "L": 80,  "B": 60, "D": 12, "barrels_in_taper": 8},
    90: {"A": 100, "L": 105, "B": 65, "D": 12, "barrels_in_taper": 8},
}

# --------------------------------------------------------------------
# 2. Helper function to 'fix' invalid polygons
def fix_polygon(poly: Polygon) -> Polygon:
    """
    Attempt to fix a polygon if it's invalid (self-intersecting, etc.)
    using either shapely.make_valid or buffer(0).
    """
    if poly.is_valid:
        return poly
    try:
        return shapely_make_valid(poly)
    except Exception:
        return poly.buffer(0)

# --------------------------------------------------------------------
def create_road_polygon(left_edge_pts, right_edge_pts):
    """
    Create a road polygon from two line segments.
    """
    L1, L2 = left_edge_pts
    R1, R2 = right_edge_pts
    coords = [L1, L2, R2, R1, L1]
    poly = Polygon(coords)
    poly = fix_polygon(poly)
    return poly

def create_work_area_polygon(four_pts):
    """
    Create a polygon from 4 corners.
    If needed, close the ring by appending the first point.
    """
    coords = list(four_pts)
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    poly = Polygon(coords)
    poly = fix_polygon(poly)
    return poly

def compute_centerline(left_edge_pts, right_edge_pts):
    """
    Compute a centerline from two edge line segments.
    """
    L1, L2 = left_edge_pts
    R1, R2 = right_edge_pts
    C1 = ((L1[0] + R1[0]) / 2.0, (L1[1] + R1[1]) / 2.0)
    C2 = ((L2[0] + R2[0]) / 2.0, (L2[1] + R2[1]) / 2.0)
    return LineString([C1, C2])

def distance_range_on_centerline(cline: LineString, closure_poly: Polygon):
    """
    Intersect cline with closure_poly and return the start and end
    distances along the cline of the largest continuous intersection.
    """
    intersection = cline.intersection(closure_poly)
    if intersection.is_empty:
        return None
    if intersection.geom_type == "LineString":
        pts = list(intersection.coords)
        start = cline.project(Point(pts[0]))
        end = cline.project(Point(pts[-1]))
        return (min(start, end), max(start, end))
    if intersection.geom_type == "MultiLineString":
        longest = max(intersection, key=lambda ls: ls.length)
        pts = list(longest.coords)
        start = cline.project(Point(pts[0]))
        end = cline.project(Point(pts[-1]))
        return (min(start, end), max(start, end))
    return None

def interpolate_points(line: LineString, start_dist: float, end_dist: float, count: int):
    """
    Return a list of points evenly spaced along the line.
    """
    if count < 2:
        return [line.interpolate(start_dist)]
    total_length = end_dist - start_dist
    step = total_length / (count - 1)
    return [line.interpolate(start_dist + i * step) for i in range(count)]

def place_cones_around_polygon(poly: Polygon, spacing: float, label="Closure Perimeter Cone"):
    """
    Place channel devices (cones) at interval 'spacing' along the polygon's exterior.
    Returns a list of GeoJSON features.
    """
    cones = []
    exterior_length = poly.exterior.length
    num_points = int(exterior_length // spacing) + 1
    for i in range(num_points):
        point = poly.exterior.interpolate(i * spacing)
        feature = {
            "type": "Feature",
            "properties": {"type": "Channel Device", "label": label},
            "geometry": {"type": "Point", "coordinates": [point.x, point.y]}
        }
        cones.append(feature)
    return cones

def generate_2D_traffic_control_plan(road_left_pts, road_right_pts, work_area_pts, speed_limit=60) -> List[Dict]:
    """
    Generate a traffic control plan as a list of GeoJSON features.
    """
    features = []
    road_poly = create_road_polygon(road_left_pts, road_right_pts)
    work_area = create_work_area_polygon(work_area_pts)
    centerline = compute_centerline(road_left_pts, road_right_pts)

    # Add road polygon feature
    features.append({
        "type": "Feature",
        "properties": {"type": "Road", "label": "Road Geometry"},
        "geometry": road_poly.__geo_interface__
    })
    # Add work area polygon feature
    features.append({
        "type": "Feature",
        "properties": {"type": "Work Area", "label": "Work Area"},
        "geometry": work_area.__geo_interface__
    })
    # Optionally, add centerline feature
    features.append({
        "type": "Feature",
        "properties": {"type": "Centerline", "label": "Road Centerline"},
        "geometry": centerline.__geo_interface__
    })
    # Place cones around work area
    cones = place_cones_around_polygon(work_area, spacing=10)
    features.extend(cones)
    
    return features

def main():
    # Sample input points for testing the plan.
    road_left = [(0, 0), (0, 50)]
    road_right = [(10, 0), (10, 50)]
    work_area = [(2, 10), (8, 10), (8, 40), (2, 40)]
    
    plan = generate_2D_traffic_control_plan(road_left, road_right, work_area)
    import json
    geojson = {"type": "FeatureCollection", "features": plan}
    with open("my_temporary_traffic_control_plan.geojson", "w") as f:
        json.dump(geojson, f, indent=2)
    print("Traffic control plan generated as my_temporary_traffic_control_plan.geojson.")

if __name__ == "__main__":
    main()