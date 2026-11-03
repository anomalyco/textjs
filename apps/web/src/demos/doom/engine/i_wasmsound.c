//
// Copyright(C) 1993-1996 Id Software, Inc.
// Copyright(C) 2005-2014 Simon Howard
// Copyright(C) 2026 Anomaly
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// DESCRIPTION:
//	Sound effects for doom.wasm: hands each sound's DMX lump to the host, which plays it.
//	Lump naming follows Chocolate Doom's i_sdlsound.c. There is no music module.
//

#include <stdint.h>

#include "doomtype.h"
#include "i_sound.h"
#include "m_misc.h"
#include "w_wad.h"
#include "z_zone.h"

#define IMPORT(name) __attribute__((import_module("sound"), import_name(name)))

// Play `length` bytes of a DMX sound lump (8-byte header, then 8-bit unsigned PCM) on `channel`.
IMPORT("startSound") void startSound(int32_t lump, const uint8_t *data, int32_t length, int32_t channel, int32_t vol, int32_t sep);
IMPORT("stopSound") void stopSound(int32_t channel);
IMPORT("isPlaying") int32_t isPlaying(int32_t channel);
// vol: 0-127. sep: 0 (left) to 254 (right), 128 centred.
IMPORT("updateSound") void updateSound(int32_t channel, int32_t vol, int32_t sep);

static boolean use_sfx_prefix;

static boolean WS_Init(boolean _use_sfx_prefix) {
  use_sfx_prefix = _use_sfx_prefix;
  return true;
}

static void WS_Shutdown(void) {}

static int WS_GetSfxLumpNum(sfxinfo_t *sfx) {
  char namebuf[9];

  if (sfx->link != NULL) {
    sfx = sfx->link;
  }

  if (use_sfx_prefix) {
    M_snprintf(namebuf, sizeof(namebuf), "ds%s", sfx->name);
  } else {
    M_StringCopy(namebuf, sfx->name, sizeof(namebuf));
  }

  return W_CheckNumForName(namebuf);
}

static void WS_Update(void) {}

static void WS_UpdateSoundParams(int channel, int vol, int sep) { updateSound(channel, vol, sep); }

static int WS_StartSound(sfxinfo_t *sfx, int channel, int vol, int sep) {
  int lump = sfx->lumpnum;
  uint8_t *data;

  if (lump < 0) {
    return -1;
  }

  data = W_CacheLumpNum(lump, PU_STATIC);
  startSound(lump, data, W_LumpLength(lump), channel, vol, sep);
  W_ReleaseLumpNum(lump);

  return channel;
}

static void WS_StopSound(int channel) { stopSound(channel); }

static boolean WS_SoundIsPlaying(int channel) { return isPlaying(channel) != 0; }

static snddevice_t sound_wasm_devices[] = {
    SNDDEVICE_SB,          SNDDEVICE_PAS,         SNDDEVICE_GUS,
    SNDDEVICE_WAVEBLASTER, SNDDEVICE_SOUNDCANVAS, SNDDEVICE_AWE32,
};

sound_module_t sound_wasm_module = {
    sound_wasm_devices,
    arrlen(sound_wasm_devices),
    WS_Init,
    WS_Shutdown,
    WS_GetSfxLumpNum,
    WS_Update,
    WS_UpdateSoundParams,
    WS_StartSound,
    WS_StopSound,
    WS_SoundIsPlaying,
    NULL,
};
