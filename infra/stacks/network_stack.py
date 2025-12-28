from aws_cdk import Stack, aws_ec2 as ec2, CfnOutput
from constructs import Construct


class NetworkStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Elastic IP dla NAT Gateway
        eip = ec2.CfnEIP(self, "NatEIP", domain="vpc")

        # VPC z publicznymi i prywatnymi podsieciami
        self.vpc = ec2.Vpc(
            self, "VPC",
            max_azs=2,
            nat_gateways=1,
            nat_gateway_provider=ec2.NatProvider.gateway(eip_allocation_ids=[eip.attr_allocation_id]),
            subnet_configuration=[
                ec2.SubnetConfiguration(name="Public", subnet_type=ec2.SubnetType.PUBLIC, cidr_mask=24),
                ec2.SubnetConfiguration(name="Private", subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS, cidr_mask=24),
                ec2.SubnetConfiguration(name="Database", subnet_type=ec2.SubnetType.PRIVATE_ISOLATED, cidr_mask=24),
            ]
        )

        # Security Group dla ALB
        self.alb_security_group = ec2.SecurityGroup(
            self, "ALBSG", vpc=self.vpc, allow_all_outbound=True
        )
        self.alb_security_group.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "HTTP")
        self.alb_security_group.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "HTTPS")

        # Security Group dla ECS
        self.ecs_security_group = ec2.SecurityGroup(
            self, "ECSSG", vpc=self.vpc, allow_all_outbound=True
        )
        self.ecs_security_group.add_ingress_rule(self.alb_security_group, ec2.Port.all_traffic(), "ALB")

        # Security Group dla RDS
        self.db_security_group = ec2.SecurityGroup(
            self, "DBSG", vpc=self.vpc, allow_all_outbound=False
        )
        self.db_security_group.add_ingress_rule(self.ecs_security_group, ec2.Port.tcp(5432), "ECS")

        # Output stałego adresu IP
        CfnOutput(self, "NatGatewayEIP", value=eip.ref, description="Statyczny adres IP NAT Gateway")
