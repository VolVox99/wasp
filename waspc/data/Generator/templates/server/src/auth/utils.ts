{{={= =}=}}
import { sign, verify } from '../core/auth.js'
import AuthError from '../core/AuthError.js'
import HttpError from '../core/HttpError.js'
import prisma from '../dbClient.js'
import { isPrismaError, prismaErrorToHttpError, sleep } from '../utils.js'
import { type {= userEntityUpper =}, type {= authEntityUpper =} } from '../entities/index.js'
import { type Prisma } from '@prisma/client';

import { throwValidationError } from './validation.js'

{=# additionalSignupFields.isDefined =}
{=& additionalSignupFields.importStatement =}
{=/ additionalSignupFields.isDefined =}

import { defineAdditionalSignupFields, type PossibleAdditionalSignupFields } from './providers/types.js'
{=# additionalSignupFields.isDefined =}
const _waspAdditionalSignupFieldsConfig = {= additionalSignupFields.importIdentifier =}
{=/ additionalSignupFields.isDefined =}
{=^ additionalSignupFields.isDefined =}
const _waspAdditionalSignupFieldsConfig = {} as ReturnType<typeof defineAdditionalSignupFields>
{=/ additionalSignupFields.isDefined =}

export const contextWithUserEntity = {
  entities: {
    {= userEntityUpper =}: prisma.{= userEntityLower =}
  }
}

export const authConfig = {
  failureRedirectPath: "{= failureRedirectPath =}",
  successRedirectPath: "{= successRedirectPath =}",
}

export async function findAuthIdentity(providerName: string, providerUserId: string) {
  return prisma.{= authIdentityEntityLower =}.findUnique({ where: { providerName_providerUserId: { providerName, providerUserId } } });
}

export async function findAuthIdentityByAuthId(authId: string) {
  return prisma.{= authIdentityEntityLower =}.findFirst({ where: { authId } });
}

export async function updateAuthIdentityProviderData(authId: string, providerData: Record<string, unknown>) {
  return prisma.{= authIdentityEntityLower =}.updateMany({
    where: { authId },
    data: { providerData: JSON.stringify(providerData) },
  });
}

export async function findAuthWithUserBy(where: Prisma.{= authEntityUpper =}WhereInput) {
  return prisma.{= authEntityLower =}.findFirst({ where, include: { {= userFieldOnAuthEntityName =}: true }});
}

export async function createAuthWithUser(data: Prisma.{= authEntityUpper =}CreateInput, additionalFields?: PossibleAdditionalSignupFields) {
  try {
    return await prisma.{= authEntityLower =}.create({
      data: {
        ...data,
        {= userFieldOnAuthEntityName =}: {
          create: {
            // Using any here to prevent type errors when additionalFields are not
            // defined. We want Prisma to throw an error in that case.
            ...(additionalFields ?? {} as any),
          }
        }
      }
    })
  } catch (e) {
    rethrowPossiblePrismaError(e);
  }
}

export async function deleteUserByAuthId(authId: string) {
  try {
    return await prisma.{= userEntityLower =}.deleteMany({ where: { auth: {
      id: authId,
    } } })
  } catch (e) {
    rethrowPossiblePrismaError(e);
  }
}

export async function createAuthToken(
  auth: {= authEntityUpper =} & { {= userFieldOnAuthEntityName =}: {= userEntityUpper =} }
): Promise<string> {
  return sign(auth.{= userFieldOnAuthEntityName =}.id);
}

export async function verifyToken(token: string): Promise<{ id: any }> {
  return verify(token);
}

// If an user exists, we don't want to leak information
// about it. Pretending that we're doing some work
// will make it harder for an attacker to determine
// if a user exists or not.
// NOTE: Attacker measuring time to response can still determine
// if a user exists or not. We'll be able to avoid it when 
// we implement e-mail sending via jobs.
export async function doFakeWork() {
  const timeToWork = Math.floor(Math.random() * 1000) + 1000;
  return sleep(timeToWork);
}

export function rethrowPossiblePrismaError(e: unknown): void {
  if (e instanceof AuthError) {
    throwValidationError(e.message);
  } else if (isPrismaError(e)) {
    throw prismaErrorToHttpError(e)
  } else {
    throw new HttpError(500)
  }
}

export async function validateAndGetAdditionalFields(data: {
  [key: string]: unknown
}) {
  const {
    password: _password,
    ...sanitizedData
  } = data;
  const result: Record<string, any> = {};
  for (const [field, getFieldValue] of Object.entries(_waspAdditionalSignupFieldsConfig)) {
    try {
      const value = await getFieldValue(sanitizedData)
      result[field] = value
    } catch (e) {
      throwValidationError(e.message)
    }
  }
  return result;
}
