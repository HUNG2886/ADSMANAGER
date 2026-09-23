import { z } from 'zod';
import {
  APPEAL_STATUSES,
  appealCooldownRemaining,
  canTransitionAppeal,
  missingAppealFields,
  type AccountAppealStatus,
} from '@/lib/account-appeals';
import { fail, ok, requestIp } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac';

const draftSchema = z.object({
  action: z.literal('SAVE_DRAFT'),
  reason: z.enum(['DISPUTE_DECISION', 'MADE_CHANGES_TO_COMPLY']).nullable(),
  suspensionReason: z.string().trim().max(3000),
  correctiveActions: z.string().trim().max(5000),
  appealStatement: z.string().trim().max(8000),
  evidenceNotes: z.string().trim().max(5000),
  contactEmail: z.union([z.literal(''), z.string().trim().email().max(180)]),
}).strict();
const transitionSchema = z.object({
  action: z.literal('TRANSITION'),
  nextStatus: z.enum(APPEAL_STATUSES),
}).strict();
const referenceSchema = z.object({
  action: z.literal('SAVE_REFERENCE'),
  googleCaseId: z.string().trim().max(200),
}).strict();
const requestSchema = z.discriminatedUnion('action', [draftSchema, transitionSchema, referenceSchema]);

function appealPayload(appeal: {
  reason: 'DISPUTE_DECISION' | 'MADE_CHANGES_TO_COMPLY' | null;
  suspensionReason: string | null;
  correctiveActions: string | null;
  appealStatement: string | null;
  contactEmail: string | null;
}) {
  return {
    reason: appeal.reason,
    suspensionReason: appeal.suspensionReason,
    correctiveActions: appeal.correctiveActions,
    appealStatement: appeal.appealStatement,
    contactEmail: appeal.contactEmail,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission(PERMISSIONS.MANAGE_APPEALS);
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('INVALID_ARGUMENT', 'Dữ liệu kháng nghị không hợp lệ.', 422);

  const appeal = await prisma.accountAppeal.findUnique({
    where: { id },
    include: { customerAccount: { select: { id: true, customerId: true, status: true, name: true } } },
  });
  if (!appeal) return fail('APPEAL_NOT_FOUND', 'Không tìm thấy hồ sơ kháng nghị.', 404);

  if (parsed.data.action === 'SAVE_DRAFT') {
    if (appeal.status !== 'DRAFT') {
      return fail('APPEAL_LOCKED', 'Hãy chuyển hồ sơ về bản nháp trước khi chỉnh sửa.', 409);
    }
    const updated = await prisma.accountAppeal.update({
      where: { id },
      data: {
        reason: parsed.data.reason,
        suspensionReason: parsed.data.suspensionReason || null,
        correctiveActions: parsed.data.correctiveActions || null,
        appealStatement: parsed.data.appealStatement || null,
        evidenceNotes: parsed.data.evidenceNotes || null,
        contactEmail: parsed.data.contactEmail || null,
        preparedById: access.user.id,
      },
    });
    await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'UPDATE_ACCOUNT_APPEAL_DRAFT', entityType: 'AccountAppeal', entityId: id, metadata: { customerId: appeal.customerAccount.customerId }, ipAddress: requestIp(request) });
    return ok(updated);
  }

  if (parsed.data.action === 'SAVE_REFERENCE') {
    const updated = await prisma.accountAppeal.update({ where: { id }, data: { googleCaseId: parsed.data.googleCaseId || null } });
    await writeAudit({ userId: access.user.id, userEmail: access.user.email, userName: access.user.name, action: 'UPDATE_ACCOUNT_APPEAL_REFERENCE', entityType: 'AccountAppeal', entityId: id, metadata: { customerId: appeal.customerAccount.customerId }, ipAddress: requestIp(request) });
    return ok(updated);
  }

  const currentStatus = appeal.status as AccountAppealStatus;
  const nextStatus = parsed.data.nextStatus;
  if (!canTransitionAppeal(currentStatus, nextStatus)) {
    return fail('INVALID_APPEAL_TRANSITION', `Không thể chuyển từ ${currentStatus} sang ${nextStatus}.`, 409);
  }
  if (nextStatus === 'READY_TO_SUBMIT') {
    if (appeal.customerAccount.status !== 'SUSPENDED') {
      return fail('ACCOUNT_NOT_SUSPENDED', 'Tài khoản hiện không còn ở trạng thái bị đình chỉ.', 409);
    }
    const missing = missingAppealFields(appealPayload(appeal));
    if (missing.length) return fail('APPEAL_INCOMPLETE', 'Hồ sơ chưa đủ thông tin để duyệt.', 422, { missingFields: missing });
  }
  if (nextStatus === 'SUBMITTED') {
    const remaining = appealCooldownRemaining(appeal.lastSubmittedAt);
    if (remaining > 0) {
      return fail('APPEAL_COOLDOWN', 'Chưa thể đánh dấu gửi lại trong vòng 24 giờ.', 409, { retryAfterSeconds: Math.ceil(remaining / 1000) });
    }
  }

  const now = new Date();
  const updated = await prisma.accountAppeal.update({
    where: { id },
    data: nextStatus === 'READY_TO_SUBMIT'
      ? { status: nextStatus, reviewedAt: now, reviewedById: access.user.id }
      : nextStatus === 'SUBMITTED'
        ? { status: nextStatus, submittedAt: now, lastSubmittedAt: now, submittedById: access.user.id, attemptCount: { increment: 1 } }
        : nextStatus === 'APPROVED' || nextStatus === 'REJECTED'
          ? { status: nextStatus, outcomeAt: now }
          : nextStatus === 'DRAFT'
            ? { status: nextStatus, reviewedAt: null, reviewedById: null, outcomeAt: null }
            : { status: nextStatus },
  });
  await writeAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    userName: access.user.name,
    action: `ACCOUNT_APPEAL_${nextStatus}`,
    entityType: 'AccountAppeal',
    entityId: id,
    metadata: { customerId: appeal.customerAccount.customerId, from: currentStatus, to: nextStatus, attemptCount: updated.attemptCount },
    ipAddress: requestIp(request),
  });
  return ok(updated);
}
