#!/usr/bin/env python3

import json
import pyproj
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import transform
from shapely.validation import make_valid as shapely_make_valid  # If Shapely 2.0 is installed.
# If that import fails, comment it out and we will use .buffer(0) instead
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
    using either shapely.make_valid (if Shapely 2.0+) or buffer(0).
    """
    if not poly.is_valid:
        try:
            # If we have Shapely 2.0:
            poly_fixed = shapely_make_valid(poly)
            return poly_fixed
        except:
            # Fallback to buffer(0) method if make_valid not available
            return poly.buffer(0)
    return poly

# --------------------------------------------------------------------
def create_road_polygon(left_edge_pts, right_edge_pts):
    """
    Create a road polygon from two line segments, each with 2 points in (x, y):
        left_edge_pts  = [(xL1, yL1), (xL2, yL2)]
        right_edge_pts = [(xR1, yR1), (xR2, yR2)]
    We'll connect L1->L2->R2->R1->L1 in order.
    """
    L1, L2 = left_edge_pts
    R1, R2 = right_edge_pts
    
    coords = [L1, L2, R2, R1, L1]
    poly = Polygon(coords)
    poly = fix_polygon(poly)
    return poly

def create_work_area_polygon(four_pts):
    """
    Create a polygon from 4 corners in (x,y).
    If needed, close the ring by appending the first point at the end.
    """
    coords = list(four_pts)
    if coords[-1] != coords[0]:
        coords.append(coords[0])
    poly = Polygon(coords)
    poly = fix_polygon(poly)
    return poly

def compute_centerline(left_edge_pts, right_edge_pts):
    """
    Roughly compute a 'centerline' from two line segments.
    We take midpoint of L1,R1 as C1, and L2,R2 as C2.
    """
    L1, L2 = left_edge_pts
    R1, R2 = right_edge_pts
    
    C1 = ((L1[0] + R1[0]) / 2.0, (L1[1] + R1[1]) / 2.0)
    C2 = ((L2[0] + R2[0]) / 2.0, (L2[1] + R2[1]) / 2.0)
    return LineString([C1, C2])

def distance_range_on_centerline(cline: LineString, closure_poly: Polygon):
    """
    Intersect 'cline' with 'closure_poly' and return (start_dist, end_dist)
    in parametric measure along cline. If no single continuous intersection,
    we pick the largest. Returns None if no intersection.
    """
    intersection = cline.intersection(closure_poly)
    if intersection.is_empty:
        return None
    
    # If it's one continuous linestring
    if intersection.geom_type == "LineString":
        start_pt = intersection.coords[0]
        end_pt   = intersection.coords[-1]
        s_dist = cline.project(Point(start_pt))
        e_dist = cline.project(Point(end_pt))
        if s_dist > e_dist:
            s_dist, e_dist = e_dist, s_dist
        return (s_dist, e_dist)
    
    # If multi, pick the longest
    if intersection.geom_type == "MultiLineString":
        lines = sorted(list(intersection), key=lambda x: x.length, reverse=True)
        if not lines:
            return None
        # Re-run on the longest line
        return distance_range_on_centerline(cline, lines[0])
    
    return None

def interpolate_points(line: LineString, start_dist: float, end_dist: float, count: int):
    """
    Return a list of points evenly spaced between start_dist and end_dist along 'line'.
    """
    if count < 2:
        return [line.interpolate(start_dist)]
    total_length = end_dist - start_dist
    step = total_length / (count - 1)
    return [line.interpolate(start_dist + i * step) for i in range(count)]

def place_cones_around_polygon(poly: Polygon, spacing: float, label="Closure Perimeter Cone"):
    """
    Place channel devices at interval 'spacing' around the polygon's exterior.
    """
    items = []
    boundary = poly.exterior
    perim_len = boundary.length
    if perim_len <= 0:
        return items
    
    # If perimeter < spacing, just place 1
    if perim_len < spacing:
        mid_pt = boundary.interpolate(perim_len / 2.0)
        items.append({
            "type": "Channel Device",
            "label": label,
            "geometry": mid_pt
        })
        return items
    
    n = int(perim_len // spacing)
    step = perim_len / max(n, 1)
    dist = 0.0
    for i in range(n+1):
        pt = boundary.interpolate(dist)
        items.append({
            "type": "Channel Device",
            "label": label,
            "geometry": pt
        })
        dist += step
    
    return items

def generate_2D_traffic_control_plan(road_left_pts, road_right_pts,
                                     work_area_pts, speed_limit=60) -> List[Dict]:
    """
    Build a 2D plan:
    1) road polygon
    2) work area polygon
    3) closure = intersection
    4) centerline intersection => place signs (A, L, B, etc.)
    5) perimeter cones
    """
    if speed_limit not in TRAFFIC_CONTROL_TABLE:
        raise ValueError(f"No traffic data for speed={speed_limit}")
    
    # Distances in meters
    tc_data = TRAFFIC_CONTROL_TABLE[speed_limit]
    A = tc_data["A"]
    L = tc_data["L"]
    B = tc_data["B"]
    D = tc_data["D"]
    barrel_count = tc_data["barrels_in_taper"]

    # 1) road polygon
    road_poly = create_road_polygon(road_left_pts, road_right_pts)
    # 2) work polygon
    work_poly = create_work_area_polygon(work_area_pts)
    # 3) closure
    closure_poly = road_poly.intersection(work_poly)
    if closure_poly.is_empty:
        print("No intersection (closure) between road and work area.")
        return []
    
    # 4) centerline
    cline = compute_centerline(road_left_pts, road_right_pts)
    c_range = distance_range_on_centerline(cline, closure_poly)
    
    plan_items = []
    
    if c_range is not None:
        # we have a single continuous closure range
        c_start, c_end = c_range
        
        # Taper region
        taper_start = max(0.0, c_start - L)
        
        # 4a) place 3 upstream signs at intervals of A
        sign_dists = []
        for i in range(1, 4):
            dist_up = taper_start - i*A
            if dist_up >= 0:
                sign_dists.append(dist_up)
        
        sign_labels = ["Road Work Ahead", "Lane Closed Ahead", "Speed Reduction Ahead"]
        for i, sd in enumerate(sign_dists):
            label = sign_labels[i] if i < len(sign_labels) else f"Advance Sign {i+1}"
            pt = cline.interpolate(sd)
            plan_items.append({
                "type": "Sign",
                "label": label,
                "geometry": pt
            })
        
        # 4b) Taper cones
        if (c_start - taper_start) > 0 and barrel_count > 0:
            taper_pts = interpolate_points(cline, taper_start, c_start, barrel_count)
            for tp in taper_pts:
                plan_items.append({
                    "type": "Channel Device",
                    "label": "Taper Barrel/Cone",
                    "geometry": tp
                })
        
        # 4c) Buffer
        buffer_end = min(c_start + B, c_end)
        if buffer_end > c_start:
            plan_items.append({
                "type": "Zone",
                "label": "Buffer Space",
                "geometry": LineString([
                    cline.interpolate(c_start),
                    cline.interpolate(buffer_end)
                ])
            })
        
        # 4d) Work area center portion
        if buffer_end < c_end:
            plan_items.append({
                "type": "Zone",
                "label": "Work Area (Center)",
                "geometry": LineString([
                    cline.interpolate(buffer_end),
                    cline.interpolate(c_end)
                ])
            })
        
        # 4e) End Road Work sign
        end_sign_dist = c_end + 5.0
        if end_sign_dist <= cline.length:
            end_sign_pt = cline.interpolate(end_sign_dist)
            plan_items.append({
                "type": "Sign",
                "label": "End Road Work",
                "geometry": end_sign_pt
            })
    
    # 5) perimeter cones around closure polygon
    #    If multi, handle sub-polygons.
    if closure_poly.geom_type == "Polygon":
        cones = place_cones_around_polygon(closure_poly, D)
        plan_items.extend(cones)
    elif closure_poly.geom_type == "MultiPolygon":
        for subpoly in closure_poly.geoms:
            cones = place_cones_around_polygon(subpoly, D)
            plan_items.extend(cones)
    
    return plan_items

# --------------------------------------------------------------------
def main():
    """
    Full pipeline:
    1) Convert your lat/lon edges to UTM (EPSG:32614),
    2) Generate plan in meters,
    3) Export plan items as GeoJSON in UTM => traffic_plan_2D_utm.geojson,
    4) Reproject plan items back to lat/lon => traffic_plan_2D_latlon.geojson.
    """
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # Actual road edges in lat, lon (per your question):
    # Road "left" edge (2 corners in lat,lon)
    L1_latlon = (49.80338753464286, -97.08237275289939)
    L2_latlon = (49.80345475891676, -97.08216947849542)
    # Road "right" edge (2 corners in lat,lon)
    R1_latlon = (49.80326121781118, -97.08228035544302)
    R2_latlon = (49.80333765850835, -97.08206364140901)
    
    # Convert (lat,lon) -> (lon,lat) for Shapely
    left_edge_latlon  = [(L1_latlon[1], L1_latlon[0]), (L2_latlon[1], L2_latlon[0])]
    right_edge_latlon = [(R1_latlon[1], R1_latlon[0]), (R2_latlon[1], R2_latlon[0])]
    
    # Work area corners in lat,lon (4 corners)
    W1_latlon = (49.80335717526273, -97.08224927629861)
    W2_latlon = (49.803402714325784, -97.08212075983658)
    W3_latlon = (49.80326121781118, -97.08228035544302)
    W4_latlon = (49.80333765850835, -97.08206364140901)
    
    work_area_latlon = [
        (W1_latlon[1], W1_latlon[0]),
        (W2_latlon[1], W2_latlon[0]),
        (W3_latlon[1], W3_latlon[0]),
        (W4_latlon[1], W4_latlon[0]),
    ]
    
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # Reproject lat/lon -> UTM (EPSG:32614) to get meter coords
    proj_to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True)
    
    def transform_coords(lonlat_list):
        # Each item is (lon, lat)
        xys = []
        for (lon, lat) in lonlat_list:
            x_m, y_m = proj_to_utm.transform(lon, lat)
            xys.append((x_m, y_m))
        return xys
    
    left_edge_utm  = transform_coords(left_edge_latlon)
    right_edge_utm = transform_coords(right_edge_latlon)
    work_area_utm  = transform_coords(work_area_latlon)
    
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # Generate plan in UTM coords
    speed_limit = 60
    plan_items = generate_2D_traffic_control_plan(
        road_left_pts=left_edge_utm,
        road_right_pts=right_edge_utm,
        work_area_pts=work_area_utm,
        speed_limit=speed_limit
    )
    
    print(f"Generated {len(plan_items)} plan items.")
    
    # Build a GeoDataFrame of plan items (in UTM)
    data_dicts = []
    for itm in plan_items:
        data_dicts.append({
            "type": itm["type"],
            "label": itm["label"],
            "geometry": itm["geometry"]
        })
    
    gdf_utm = gpd.GeoDataFrame(data_dicts, geometry=[d["geometry"] for d in data_dicts])
    gdf_utm.crs = "EPSG:32614"
    
    # Save UTM version
    gdf_utm.to_file("traffic_plan_2D_utm.geojson", driver="GeoJSON")
    print("Saved 'traffic_plan_2D_utm.geojson' in EPSG:32614 (meters).")
    
    # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # Reproject plan items back to lat/lon (EPSG:4326)
    gdf_latlon = gdf_utm.to_crs("EPSG:4326")
    gdf_latlon.to_file("traffic_plan_2D_latlon.geojson", driver="GeoJSON")
    print("Saved 'traffic_plan_2D_latlon.geojson' in EPSG:4326 (lat/lon).")
    print("Open 'traffic_plan_2D_latlon.geojson' in geojson.io to view the plan.")


if __name__ == "__main__":
    main()
