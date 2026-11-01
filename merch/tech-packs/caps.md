# 006–007 Caps: console.log Cap, ▼ Cap

Two caps on the same blank, embroidered on demand by Fourthwall in white thread.

## Blank

| | |
| --- | --- |
| Fourthwall product | Yupoong Classic Dad Hat, Embroidered, from $15.65 base, no minimum |
| Style | Yupoong 6245CM |
| Fabric | 100% cotton chino twill |
| Construction | Unstructured, low profile, six panels, 3⅛ in crown, pre-curved visor with four rows of stitching |
| Closure | Self-fabric strap, antique brass buckle |
| Color | Black |
| Size | One size, adjustable |
| Embroidery areas | Front Large (about 4 × 2 in on dad hats), Back, Left Side, Right Side |

Fourthwall's embroidery limits: 15,000 stitches, six thread colors, lowercase letters at least 0.25 in tall, uppercase at least 0.3 in, strokes at least 0.05 in thick.

## 006 console.log Cap

| | |
| --- | --- |
| Artwork | `artwork/console-cap-front.svg`, `png/console-cap-front.png` |
| Design | console.log in Geist Mono Bold |
| Size | 3.4 × 0.45 in: 0.37 in cap height, 0.27 in lowercase, stems about 0.06 in |
| Placement | Front Large, centered on the front seam, bottom of the g 0.85 in above the brim seam |
| Stitch | Satin columns across each stroke, center-out, with an edge-walk underlay |
| Thread | White |
| Photos | `photos/final/console-cap-1.webp` (three-quarter front), `-2` (close-up), `-3` (back) |

The lowercase is 0.27 in, just over the 0.25 in minimum, so this can't be made smaller. The lettering crosses the front seam, as the ▼ does; ask for a sample to check the "l" and "e" that land on it.

## 007 ▼ Cap

| | |
| --- | --- |
| Artwork | `artwork/mark-cap-front.svg`, `png/mark-cap-front.png` |
| Size | 1.6 × 1.4 in |
| Placement | Front Large, centered on the front seam, apex 0.6 in above the brim seam |
| Stitch | Fill with a 1 mm satin border, center-out |
| Thread | White |
| Photos | `photos/final/mark-cap-1.webp` (three-quarter front), `-2` (close-up), `-3` (back) |

## Care

Spot clean with cold water. Air dry.

## How the cap photos were made

The ▼ is placed on the crown's surface, symmetric about the measured centre front seam (the half on the left panel, which turns away from the camera, foreshortens), then stitched by an image edit and fitted back onto the exact mark. The lettering is centred on the same seam at its mid-height. The lettering starts as the vector type on a mesh that follows the crown (`scripts/capmesh.ts`): the crown is modelled as a cylinder fitted to the cap's silhouette and seams, so the type foreshortens toward the left panel, rises along the seams and follows the brim's curve. The image model then stitches it in an edit, and `scripts/cap-edit.ts` corrects the edit back onto the exact letterforms: each letter's stitches are registered to the type, thread is grown into any stroke the model drew thinner, and thread it drew wider is replaced by the original twill with a soft contact shadow. The satin direction, sheen, relief and puckering come from the edit; the outlines come from the type.
