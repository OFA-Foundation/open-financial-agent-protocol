/**
 * Line profiles, draft 0.1
 *
 * A line profile is the common core of questions for one product line. A
 * product's question set (`get_question_set`) MUST include every required core
 * question of its line, with the same key, and MAY add its own questions. Two
 * products of the same line can then be quoted from the same answers.
 *
 * Each profile comes from an MCP server in production:
 * - insurance/pet: a pet insurer, FR, DE, SE
 * - insurance/home: a home insurer, ES
 *
 * A profile needs a second distributor of the same line before it is stable.
 * Draft 0.1 has insurance profiles only. A later sector module adds its own.
 */

import type { AnswersSchema, ProductLine, Sector } from "./schema";

export interface LineProfile {
  /** Identifier, for example "insurance/pet@0.1". */
  id: string;
  sector: Sector;
  line: ProductLine;
  version: string;
  answers_schema: AnswersSchema;
  /** Sources this profile was derived from, by line and country. */
  derived_from: string[];
}

const country = { type: "string", pattern: "^[A-Z]{2}$", "x-ask": "In which country do you live?" };

export const INSURANCE_PET: LineProfile = {
  id: "insurance/pet@0.1",
  sector: "insurance",
  line: "pet",
  version: "0.1",
  derived_from: ["pet insurer, FR, DE, SE"],
  answers_schema: {
    type: "object",
    properties: {
      country,
      postal_code: { type: "string", "x-ask": "What is your postal code?" },
      municipality_code: {
        type: "string",
        description: "Official municipality code, where the tariff uses it (for example in Sweden).",
      },
      species: { type: "string", enum: ["dog", "cat"], "x-ask": "Is it a dog or a cat?" },
      pet_name: { type: "string", "x-ask": "What is your pet's name?" },
      breed: { type: "string", "x-ask": "What breed is it?" },
      is_mixed_breed: { type: "boolean" },
      mixed_breed_size: {
        type: "string",
        enum: ["small", "medium", "large", "giant"],
        description: "Dogs of mixed breed with unknown parents only.",
      },
      sex: { type: "string", enum: ["female", "male"] },
      is_neutered: { type: "boolean", "x-ask": "Is your pet neutered or spayed?" },
      date_of_birth: {
        type: "string",
        format: "date",
        "x-ask": "When was your pet born? An approximate date is fine.",
      },
      lifestyle: { type: "string", enum: ["indoor", "outdoor"], description: "Cats only. Do not set for dogs." },
    },
    required: ["country", "postal_code", "species", "pet_name", "breed", "sex", "is_neutered", "date_of_birth"],
  },
};

export const INSURANCE_HOME: LineProfile = {
  id: "insurance/home@0.1",
  sector: "insurance",
  line: "home",
  version: "0.1",
  derived_from: ["home insurer, ES"],
  answers_schema: {
    type: "object",
    properties: {
      country,
      street: { type: "string", "x-ask": "What is the street and number of the property?" },
      city: { type: "string" },
      postal_code: { type: "string", "x-ask": "What is the postal code?" },
      usage: {
        type: "string",
        enum: ["tenant", "owner_occupied", "landlord", "second_home"],
        "x-ask": "Do you rent it, live in it as the owner, rent it out, or use it as a second home?",
      },
      floor_area_m2: { type: "number", exclusiveMinimum: 0, "x-ask": "How many square metres is the property?" },
      property_type: {
        type: "string",
        enum: ["house", "apartment"],
        description: "Not asked by the source server today. Most home tariffs need it.",
      },
    },
    required: ["country", "street", "city", "postal_code", "usage", "floor_area_m2"],
  },
};

export const PROFILES: LineProfile[] = [INSURANCE_PET, INSURANCE_HOME];
