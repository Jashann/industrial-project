import osmnx as ox
import folium
from shapely.geometry import LineString, MultiLineString, Point
from shapely.affinity import scale as shapely_affine_scale

# ------------------------------
# 1. Define a Very Small Bounding Box in Winnipeg
north = 49.8954
south = 49.8948
east  = -97.1370
west  = -97.1380

# Download only the "drive" network within that bounding box.
G = ox.graph_from_bbox(north, south, east, west, network_type='drive')

# Convert to GeoDataFrames.
nodes, edges = ox.graph_to_gdfs(G)
print(f"Downloaded {len(nodes)} nodes and {len(edges)} edges for a small Winnipeg area.")

# ------------------------------
# 2. Project to a Metric CRS (UTM Zone 14N for Winnipeg).
edges_proj = edges.to_crs(epsg=32614)

# ------------------------------
# 3. (Optional) Scaling example (commented out).
def scale_geometry(geom, scale_factor):
    centroid = geom.centroid
    return shapely_affine_scale(geom, xfact=scale_factor, yfact=scale_factor, origin=(centroid.x, centroid.y))

# SCALE_FACTOR = 2.0
# edges_scaled = edges_proj.copy()
# edges_scaled['geometry'] = edges_scaled['geometry'].apply(lambda g: scale_geometry(g, SCALE_FACTOR))

# For Folium, reproject back to WGS84.
edges_wgs84 = edges_proj.to_crs(epsg=4326)

# Create a Folium map centered on the bounding box's midpoint.
mid_lat = (north + south) / 2.0
mid_lon = (east + west) / 2.0
m = folium.Map(location=[mid_lat, mid_lon], zoom_start=18)

# ------------------------------
# 4. Draw road centerlines.
for idx, row in edges_wgs84.iterrows():
    geom = row.geometry
    if geom.geom_type == "LineString":
        coords = [(lat, lon) for lon, lat in geom.coords]  # Swap order: (lat, lon)
        folium.PolyLine(locations=coords, color="blue", weight=3).add_to(m)
    elif geom.geom_type == "MultiLineString":
        for part in geom:
            coords = [(lat, lon) for lon, lat in part.coords]
            folium.PolyLine(locations=coords, color="blue", weight=3).add_to(m)

# ------------------------------
# 5. Place custom icons along road midpoints.
cone_icon_path = 'cone_icon.png'  # Replace with a valid local path or URL.
for idx, row in edges_wgs84.iterrows():
    line = row.geometry
    if line.geom_type in ["LineString", "MultiLineString"]:
        midpoint = line.interpolate(0.5, normalized=True)
        cone_icon = folium.CustomIcon(
            icon_image=cone_icon_path,
            icon_size=(32, 32)
        )
        folium.Marker(
            location=[midpoint.y, midpoint.x],
            icon=cone_icon,
            popup="Work Zone Cone"
        ).add_to(m)

# Save the map.
output_html = "small_winnipeg_section.html"
m.save(output_html)
print(f"Map saved to: {output_html}. Open in a browser to view.")