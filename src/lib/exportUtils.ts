export const generateCadQueryScript = (config: any) => {
  return `"""
Zero-Gap Laser CAD - Auto-Generated Script
هذا السكربت تم توليده تلقائياً من التطبيق.
قم بتشغيله باستخدام Python و CadQuery للحصول على ملف STEP صلب (B-Rep) عالي الدقة للماكينة.
"""

import cadquery as cq
import os

# ==========================================
# 1. المعاملات المستوردة من الواجهة
# ==========================================
# أبعاد الأنبوب
tube_major = ${config.tube.width}
tube_minor = ${config.tube.height}
wall_thickness = ${config.tube.thickness}
total_tube_length = ${config.tube.totalLength}
part_length = ${config.tube.partLength}
tube_corner_radius = ${config.tube.cornerRadius}

# شكل المقلاة
pan_top_dia = ${config.pan.topDiameter}
pan_bottom_dia = ${config.pan.bottomDiameter}
pan_height = ${config.pan.height}
bottom_fillet = ${config.pan.bottomFilletRadius}

# زوايا الإمالة والتركيب
tilt_angle = ${config.assembly.tiltAngle}
tilt_axis = "${config.assembly.tiltAxis}"
handle_angle = ${config.assembly.handleAngle}
insertion_distance = ${config.assembly.insertionDistance}
height_offset = ${config.assembly.heightOffset}

# التعشيش واللمسات
nesting_mode = "${config.nestingMode}"
slug_gap = ${config.slugGap}
apply_fillet = ${config.addFillet ? 'True' : 'False'}
thermal_clearance = ${config.thermalClearance ? 'True' : 'False'}

# ==========================================
# 2. دوال النمذجة (Engineering Engine)
# ==========================================
def create_pan(top_dia, bottom_dia, height, fillet_r):
    r_top, r_bottom = top_dia/2, bottom_dia/2
    cone = cq.Solid.makeCone(r_top, r_bottom, height, cq.Vector(0,0,0), cq.Vector(0,0,1))
    pan = cq.Workplane("XY").add(cone)
    if fillet_r > 0:
        bottom_edge = pan.edges("|Z and <Z")
        if bottom_edge.size() > 0:
            pan = pan.fillet(fillet_r, bottom_edge)
    return pan

def create_tube(major, minor, length, thickness, radius, clearance=False):
    # إنشاء شكل بيضاوي أو مستطيل مقوس
    delta = 0.1 if clearance else 0.0
    outer = cq.Workplane("XY").rect(major, minor).extrude(length)
    if radius > 0:
        outer = outer.edges("|Z").fillet(radius)
        
    inner_major = max(0.1, major - 2*thickness + delta)
    inner_minor = max(0.1, minor - 2*thickness + delta)
    inner_radius = max(0.1, radius - thickness + delta)
    
    inner = cq.Workplane("XY").rect(inner_major, inner_minor).extrude(length)
    if inner_radius > 0:
        inner = inner.edges("|Z").fillet(inner_radius)
        
    return outer.cut(inner)

def cut_with_pan(tube, pan, tilt_angle, tilt_axis, pan_z_position):
    panned = pan.translate((0,0, pan_z_position))
    axis_vec = (1,0,0) if tilt_axis == "X" else (0,1,0)
    rotated_tube = tube.rotate((0,0,0), axis_vec, tilt_angle)
    return rotated_tube.cut(panned)

def cut_handle_angle(tube, angle, length):
    import math
    if angle == 0:
        return tube
    
    # القطع عند الطرف الخلفي (طول القطعة)
    rad = math.radians(angle)
    normal = (0, -math.sin(rad), math.cos(rad))
    plane = cq.Plane(origin=(0,0, length), normal=normal)
    return tube.cut(plane)

# ==========================================
# 3. بناء المجسم
# ==========================================
print("جاري إنشاء المقلاة والأنبوب...")
pan = create_pan(pan_top_dia, pan_bottom_dia, pan_height, bottom_fillet)
tube = create_tube(tube_major, tube_minor, total_tube_length, wall_thickness, tube_corner_radius, thermal_clearance)

print("جاري تنفيذ عملية القطع لتطابق الصفر...")
part = cut_with_pan(tube, pan, tilt_angle, tilt_axis, part_length)
part = cut_handle_angle(part, handle_angle, total_tube_length)

if nesting_mode == "twin":
    print("جاري إنشاء وضع التعشيش (القطعتين المتقابلتين)...")
    top_faces = part.faces(">Z")
    if top_faces.size() > 0:
        mirror_face = top_faces.val()
        part2 = part.mirror(mirror_face)
        # إزاحة
        part2 = part2.translate((0, 0, slug_gap))
        part = part.union(part2)

if apply_fillet:
    print("تتم الآن إضافة الفيليه (تنعيم 0.2mm)...")
    try:
        part = part.fillet(0.2)
    except:
        print("تحذير: لا يمكن تطبيق الفيليه هندسياً على هذه الزوايا الحادة.")

# التمركز حول نقطة الصفر (centerXY)
print("تمركز القطعة عند نقطة الصفر للماكينة...")
part = part.translate((-part.val().BoundingBox().center.x, -part.val().BoundingBox().center.y, -part.val().BoundingBox().zmin))

# ==========================================
# 4. التصدير بصيغة STEP
# ==========================================
output_filename = "ZeroGap_Export.step"
cq.exporters.export(part, output_filename)
print(f"✅ تم التصدير بنجاح: {os.path.abspath(output_filename)}")
print("💡 قم الآن بنقل هذا الملف إلى برنامج WiseCAM أو NcStudio")
`;
};
