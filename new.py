import osmnx as ox
import geopandas as gpd
import folium
from shapely.geometry import Point, LineString, shape
from shapely.ops import transform
import pyproj

# ------------------------------
# 1. Define a Very Small Bounding Box in Winnipeg
#    Instead of a large radius, let's specify a direct bounding box.
#    The values below are just an example near downtown Winnipeg.
#    You can refine them to target exactly the road section you want.
# ------------------------------
north = 49.8954
south = 49.8948
east  = -97.1370
west  = -97.1380

# Create a bounding box tuple (north, south, east, west).
bbox = (north, south, east, west)

# Download only the "drive" network within that bounding box
G = ox.graph_from_bbox(bbox, network_type='drive')

# Convert to GeoDataFrames
nodes, edges = ox.graph_to_gdfs(G)
print(f"Downloaded {len(nodes)} nodes and {len(edges)} edges for a small Winnipeg area.")

# ------------------------------
# 2. Project to a Metric CRS (UTM Zone)
#    For Winnipeg, typically EPSG:32614 (WGS 84 / UTM zone 14N).
# ------------------------------
edges_proj = edges.to_crs(epsg=32614)

# (Optional) Inspect typical coordinates
# print(edges_proj.geometry.iloc[0])

# ------------------------------
# 3. (Optional) Scale the Geometry
#    If you want to "blow up" the geometry for a custom display:
#    1. Keep it in a local projected coordinate system.
#    2. Apply a scale transform.
#    3. This is only useful if you're rendering on a custom canvas.
#
#    In this example, we demonstrate how to do it, then continue to Folium
#    which actually needs lat/lon, so we'll transform it back again.
# ------------------------------
def scale_geometry(geom, scale_factor):
    # Scale around the centroid
    centroid = geom.centroid
    # Use an affine transformation approach
    return shapely_affine_scale(geom, xfact=scale_factor, yfact=scale_factor, origin=(centroid.x, centroid.y))

# We need a helper from shapely
from shapely.affinity import scale as shapely_affine_scale

# Let's say we want to double the size
SCALE_FACTOR = 2.0

# If you REALLY want to scale:
# edges_scaled = edges_proj.copy()
# edges_scaled['geometry'] = edges_scaled['geometry'].apply(lambda g: scale_geometry(g, SCALE_FACTOR))
# Then proceed with edges_scaled for your custom analysis.

# For Folium, we'll just skip the scaling and stick with the original projected data (edges_proj).

# ------------------------------
# 4. Convert (Reproject) Back to WGS84 and Plot in Folium
# ------------------------------
edges_wgs84 = edges_proj.to_crs(epsg=4326)

# Create a Folium map centered on the bounding box's midpoint.
mid_lat = (north + south) / 2.0
mid_lon = (east + west) / 2.0
m = folium.Map(location=[mid_lat, mid_lon], zoom_start=18)  # zoom in tight

# Draw the road centerlines.
for idx, row in edges_wgs84.iterrows():
    geom = row.geometry
    if isinstance(geom, LineString):
        coords = [(lat, lon) for lon, lat in geom.coords]
        folium.PolyLine(coords, color='blue', weight=3).add_to(m)
    else:
        # Handle MultiLineString if present
        for line in geom:
            coords = [(lat, lon) for lon, lat in line.coords]
            folium.PolyLine(coords, color='blue', weight=3).add_to(m)

# ------------------------------
# 5. Overlay Custom Icons (e.g., Cones or Signs)
#    We'll place them at random road midpoints for demonstration.
# ------------------------------
# Let's create a custom icon. You can use any local image file or URL.
# For this example, let's assume you have 'cone_icon.png' in the same folder.
# If you don't, you can pass a URL to an image or skip it.

cone_icon_path = 'cone_icon.png'  # replace with a real path or an online URL
for idx, row in edges_wgs84.iterrows():
    line = row.geometry
    midpoint = line.interpolate(0.5, normalized=True)
    
    # Create a custom icon (if you have a local or URL image).
    cone_icon = folium.features.CustomIcon(
        icon_image=cone_icon_path,
        icon_size=(32, 32)  # adjust as needed
    )
    
    folium.Marker(
        location=[midpoint.y, midpoint.x],
        icon=cone_icon,
        popup="Work Zone Cone"
    ).add_to(m)

# Save the map
output_html = "small_winnipeg_section.html"
m.save(output_html)
print(f"Map saved to: {output_html}. Open in a browser to view.")
