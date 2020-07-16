S = Hash(default_value='')

@construct
def seed():
    S['name'] = "Our Place"
    S['description'] = "Creativity grows here."
    S['icon_svg'] = ""

@export
def colorPixel(x: int, y: int, color: str):
    int(color, 16)
    S[x, y] = color