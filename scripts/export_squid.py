"""Stavium Squid Games website data (Day 4) -> public/squid.json.
Players keep their Game-1 numbers (1..1012), wild cards follow (1013..), new players after. Unfollowers' beds become KHAALI.
Crew C001.. (old 250, Day-3 80, new). VIP list = Day-3 VIPs + the most active VIP requesters (45 of 50 seats).
Inputs: follower-forest/src/rosterSG2.json + rosterSG3.json, the latest follower snapshot, survival/ep4/req.json (requests)."""
import glob, json, os
ROOT = r"D:\stavium-reels"; FF = ROOT + r"\follower-forest\src"
r2 = json.load(open(FF + r"\rosterSG2.json", encoding="utf-8")); r3 = json.load(open(FF + r"\rosterSG3.json", encoding="utf-8"))
req = json.load(open(ROOT + r"\survival\ep4\req.json", encoding="utf-8"))
F = set(req["F"])                                   # followers now (snapshot + newest)
SELF = {"stavium.ai", "chef_tusharjangra"}
FRONT = r2.get("frontman") or "7h_fl4sh"
VIPMAX, PMAX, CMAX = 50, 2000, 500

players, seen = [], set()
def add_player(n, u, st):
    players.append([n, u, st]); seen.add(u)
outs = set(r2["out"])
for i, u in enumerate(r2["seats"]):
    n = i + 1
    if u == "-" or u in SELF: players.append([n, "", "empty"]); continue
    if n in outs: add_player(n, u, "out"); continue
    add_player(n, u, "alive" if u in F else "empty_left")
n = len(r2["seats"])
for u in r3["wild"]:
    if u in seen or u == FRONT or u in SELF: continue
    n += 1; add_player(n, u, "alive" if u in F else "empty_left")
# crew
crew = []; cs = set()
for u in list(r2["crew"]) + list(r3["crewNew"]):
    if u in cs or u in SELF: continue
    crew.append([len(crew) + 1, u, "alive" if u in F else "empty_left"]); cs.add(u)
for u in req["C"]:
    if u in F and u not in cs and u not in seen: crew.append([len(crew) + 1, u, "alive"]); cs.add(u)
# new players: requests + silent newest followers not yet in the game
newest = ["alam0083", "ruksana78943", "bhavya678edits", "mid.abc", "prikc_e", "bapodaravejabhai", "auragautam2828", "freak_encyclopedia_", "sprit_edits_", "_om__450_",
          "official_devansh_1114", "dark_bankai.469", "manj.upal8125", "adolf_hit1ers", "liakatali9345", "tate_deamon", "aditya_sawhney670", "rupsha_guhu", "khan27_15",
          "hemantchamaria2026", "_chamgadar_man", "theprem183", "not_taufeek", "henil.x33", "kaushalsuryansh_x09", "antic_frends__0718", "laddu_ji_7056", "tarique_jameel_ahmed"]
COUPLE = {"laddu_ji_7056": "065-B"}
for u in req["P"] + newest:
    if u in F and u not in seen and u not in cs and u not in SELF and u not in COUPLE: n += 1; add_player(n, u, "alive")
# VIP: Day-3 VIPs first, then requesters in comment order (all must follow); arjun + superlazy guaranteed
vip = [u for u in r3["vip"] if u in F]
for u in ["arjunx_dhxngra", "__superlazy"] + req["V"]:
    if len(vip) >= 45: break
    if u in F and u not in vip and u != FRONT: vip.append(u)
role_vip = set(vip)
alive = sum(1 for p in players if p[2] == "alive") + len(COUPLE)
out = {"asOf": "2026-11-25", "max": {"players": PMAX, "crew": CMAX, "vip": VIPMAX},
       "count": {"players": alive, "crew": sum(1 for c in crew if c[2] == "alive"), "vip": len(vip), "out": len(outs), "left": sum(1 for p in players if p[2] == "empty_left")},
       "players": players, "couple": [[65, "syntex_lakshay", "laddu_ji_7056"]], "crew": crew, "vip": vip, "frontman": FRONT}
json.dump(out, open(ROOT + r"\forest-site\public\squid.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"vip": vip, "players_new": [p for p in players if p[0] > 1198]}, open(ROOT + r"\survival\ep4\day4_roles.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(out["count"], "players rows", len(players), "crew rows", len(crew), "vip", vip[:6], "...")
for u in ["anant_jatav_07_2013", "syntex_lakshay", "turzvyn", "exotic.sayan", "alam0083", "__superlazy", "arjunx_dhxngra"]:
    print(" ", u, [p[:1] + p[2:] for p in players if p[1] == u], [c[0] for c in crew if c[1] == u], u in role_vip)
