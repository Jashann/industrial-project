import geopandas as gpd
import matplotlib.pyplot as plt

# Load your GeoJSON file
gdf = gpd.read_file("my_temporary_traffic_control_plan.geojson")

# Plot the data
fig, ax = plt.subplots(figsize=(10, 6))
gdf.plot(ax=ax, column="type", legend=True, markersize=100, alpha=0.7)

# Annotate labels, handling both Point and LineString geometries
for idx, row in gdf.iterrows():
    geom = row.geometry

    # Check if the geometry is a Point (for signs, cones, etc.)
    if geom.geom_type == "Point":
        ax.text(geom.x, geom.y, row["label"], fontsize=9, ha="right")

    # If it's a LineString (like a buffer or work area), annotate at the midpoint
    elif geom.geom_type == "LineString":
        midpoint = geom.interpolate(0.5, normalized=True)  # Gets a mid-point along the line
        ax.text(midpoint.x, midpoint.y, row["label"], fontsize=9, ha="center", color="red")

plt.title("Traffic Control Plan Visualization")
plt.xlabel("Easting (meters)")
plt.ylabel("Northing (meters)")
plt.show()
