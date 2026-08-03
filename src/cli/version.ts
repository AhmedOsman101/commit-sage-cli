// Copyright (C) 2025 Ahmad Othman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

import denoConfig from "../../deno.json" with { type: "json" };

export const VERSION: string = denoConfig.version as string;
