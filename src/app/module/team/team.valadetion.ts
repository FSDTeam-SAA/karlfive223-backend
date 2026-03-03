import { z } from 'zod';

const changeTeamMemberSchema = z.object({
  memberType: z.enum(['user', 'player'], {
    message: "Member type must be either 'user' or 'player'"
  }),
  newMemberEmail: z
    .string({
      message: "New member email is required"
    })
    .email("Invalid email format")
    .trim()
    .toLowerCase()
});

export const teamValidation = {
  changeTeamMemberSchema,
};
